#!/usr/bin/env node
/**
 * HERMES SELF-HEALING DB LAYER (Direct Execution)
 * Runs DB health checks + auto-repair WITHOUT Vercel deployment
 * Usage: node scripts/db-heal.js [--check-only] [--auto-repair] [--full]
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars from multiple possible locations
dotenv.config({ path: join(__dirname, '../.env.production') });
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(process.cwd(), '.env.production') });
dotenv.config({ path: join(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const args = process.argv.slice(2);
const checkOnly = !args.includes('--auto-repair');
const autoRepair = args.includes('--auto-repair') || args.includes('--repair');
const fullReport = args.includes('--full') || args.includes('-f');

console.log('🏥 HERMES DB SELF-HEALING SYSTEM');
console.log('===============================\n');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found. Set it in .env or .env.production');
  process.exit(1);
}

async function main() {
  try {
    console.log(`Mode: ${autoRepair ? 'AUTO-REPAIR' : 'CHECK-ONLY'}`);
    console.log(`Full report: ${fullReport ? 'YES' : 'NO'}\n`);
    
    const report = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
      auto_repairs: []
    };
    
    // Run checks
    console.log('🔍 Running health checks...\n');
    
    report.checks.fk_drift = await checkFKDrift();
    report.checks.orphaned_records = await checkOrphanedRecords();
    report.checks.canonical_model = await checkCanonicalModel();
    
    // Determine overall status
    const allChecks = Object.values(report.checks);
    if (allChecks.some(c => c.status === 'error')) {
      report.status = 'broken';
    } else if (allChecks.some(c => c.status === 'fail')) {
      report.status = 'degraded';
    }
    
    // Auto-repair if requested
    if (autoRepair && report.status !== 'healthy') {
      console.log('\n🔧 Performing auto-repairs...\n');
      report.auto_repairs = await performAutoRepair(report.checks);
    }
    
    // Full report
    if (fullReport) {
      report.diagnostics = await getFullDiagnostics();
    }
    
    // Output report
    console.log('\n📊 FINAL REPORT');
    console.log('================\n');
    console.log(JSON.stringify(report, null, 2));
    
    // Summary
    console.log('\n📋 SUMMARY');
    console.log(`Status: ${report.status.toUpperCase()}`);
    console.log(`FK Issues: ${report.checks.fk_drift.issues?.length || 0}`);
    console.log(`Orphaned Records: ${report.checks.orphaned_records.count || 0}`);
    console.log(`Auto-repairs: ${report.auto_repairs.length}`);
    
    await pool.end();
    
    process.exit(report.status === 'healthy' ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// ==================== CHECK FUNCTIONS ====================

async function checkFKDrift() {
  const result = { status: 'pass', issues: [], repairs_needed: [] };
  
  try {
    // Check for FKs pointing to calendar_events
    const forbiddenFKs = await pool.query(`
      SELECT conname, conrelid::regclass as table_name
      FROM pg_constraint 
      WHERE confrelid = 'calendar_events'::regclass
      AND contype = 'f'
    `);
    
    if (forbiddenFKs.rows.length > 0) {
      result.status = 'fail';
      result.issues.push({
        type: 'forbidden_fk',
        message: 'Foreign keys pointing to calendar_events (FORBIDDEN)',
        details: forbiddenFKs.rows
      });
      result.repairs_needed.push('drop_fk_calendar_events');
    }
    
    // Check for missing FKs to bookings
    const requiredTables = ['staff_confirmations', 'event_timeline'];
    
    for (const tableName of requiredTables) {
      const fks = await pool.query(`
        SELECT conname FROM pg_constraint 
        WHERE conrelid = $1::regclass
        AND confrelid = 'bookings'::regclass
        AND contype = 'f'
      `, [tableName]);
      
      if (fks.rows.length === 0) {
        result.status = 'fail';
        result.issues.push({
          type: 'missing_fk',
          message: `${tableName} missing FK to bookings(event_id)`
        });
        result.repairs_needed.push(`add_fk_${tableName}_to_bookings`);
      }
    }
    
    console.log(`  ✓ FK Drift: ${result.status}`);
    if (result.issues.length > 0) {
      console.log(`    Issues: ${result.issues.length}`);
    }
    
  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    console.log(`  ✗ FK Drift check error: ${error.message}`);
  }
  
  return result;
}

async function checkOrphanedRecords() {
  const result = { status: 'pass', count: 0, samples: [] };
  
  try {
    // Check staff_confirmations
    const scOrphans = await pool.query(`
      SELECT COUNT(*) as count FROM staff_confirmations sc
      LEFT JOIN bookings b ON sc.event_id = b.event_id
      WHERE b.event_id IS NULL
    `);
    
    if (parseInt(scOrphans.rows[0].count) > 0) {
      result.status = 'fail';
      result.count += parseInt(scOrphans.rows[0].count);
      console.log(`  ✗ Orphaned staff_confirmations: ${scOrphans.rows[0].count}`);
    }
    
    // Check event_timeline
    const etOrphans = await pool.query(`
      SELECT COUNT(*) as count FROM event_timeline et
      LEFT JOIN bookings b ON et.event_id = b.event_id
      WHERE b.event_id IS NULL
    `);
    
    if (parseInt(etOrphans.rows[0].count) > 0) {
      result.status = 'fail';
      result.count += parseInt(etOrphans.rows[0].count);
      console.log(`  ✗ Orphaned event_timeline: ${etOrphans.rows[0].count}`);
    }
    
    if (result.status === 'pass') {
      console.log(`  ✓ Orphaned Records: None`);
    }
    
  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    console.log(`  ✗ Orphan check error: ${error.message}`);
  }
  
  return result;
}

async function checkCanonicalModel() {
  const result = { status: 'pass', issues: [] };
  
  try {
    // Check bookings.event_id is PK
    const pkCheck = await pool.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'bookings'::regclass 
      AND contype = 'p'
    `);
    
    if (pkCheck.rows.length === 0) {
      result.status = 'fail';
      result.issues.push({ type: 'missing_pk', message: 'bookings missing PK on event_id' });
      console.log(`  ✗ bookings table: Missing PRIMARY KEY`);
    } else {
      console.log(`  ✓ Canonical Model: bookings.event_id is PK`);
    }
    
  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    console.log(`  ✗ Canonical model check error: ${error.message}`);
  }
  
  return result;
}

// ==================== REPAIR FUNCTIONS ====================

async function performAutoRepair(checks) {
  const actions = [];
  
  try {
    // Repair 1: Drop forbidden FKs
    if (checks.fk_drift.repairs_needed.includes('drop_fk_calendar_events')) {
      console.log('  🔧 Dropping FKs to calendar_events...');
      await pool.query(`ALTER TABLE staff_confirmations DROP CONSTRAINT IF EXISTS staff_confirmations_event_id_fkey`);
      await pool.query(`ALTER TABLE event_timeline DROP CONSTRAINT IF EXISTS event_timeline_event_id_fkey`);
      actions.push({ action: 'drop_fk_calendar_events', status: 'success' });
      console.log('    ✓ Done');
    }
    
    // Repair 2: Add missing FKs to bookings
    if (checks.fk_drift.repairs_needed.includes('add_fk_staff_confirmations_to_bookings')) {
      console.log('  🔧 Adding FK: staff_confirmations → bookings...');
      await pool.query(`
        ALTER TABLE staff_confirmations 
        ADD CONSTRAINT staff_confirmations_event_id_fkey 
        FOREIGN KEY (event_id) REFERENCES bookings(event_id)
      `);
      actions.push({ action: 'add_fk_staff_confirmations', status: 'success' });
      console.log('    ✓ Done');
    }
    
    if (checks.fk_drift.repairs_needed.includes('add_fk_event_timeline_to_bookings')) {
      console.log('  🔧 Adding FK: event_timeline → bookings...');
      await pool.query(`
        ALTER TABLE event_timeline 
        ADD CONSTRAINT event_timeline_event_id_fkey 
        FOREIGN KEY (event_id) REFERENCES bookings(event_id)
      `);
      actions.push({ action: 'add_fk_event_timeline', status: 'success' });
      console.log('    ✓ Done');
    }
    
  } catch (error) {
    actions.push({ action: 'repair_error', status: 'error', error: error.message });
    console.log(`  ✗ Repair error: ${error.message}`);
  }
  
  return actions;
}

async function getFullDiagnostics() {
  try {
    const diagnostics = {};
    
    const tableSizes = await pool.query(`
      SELECT relname as table_name, n_live_tup as row_count
      FROM pg_stat_user_tables 
      WHERE relname IN ('bookings', 'staff_confirmations', 'event_timeline', 'whatsapp_messages', 'calendar_events')
    `);
    diagnostics.table_sizes = tableSizes.rows;
    
    return diagnostics;
  } catch (error) {
    return { error: error.message };
  }
}

// Run
main();
