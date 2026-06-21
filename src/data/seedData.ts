import { Client, Venue, Staff, Event } from '../types';

// Seed/Initial Data in case LocalStorage is empty or for South African migration

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'Lady Day',
    contact: 'Lerato Maroga',
    email: 'events@ladyday.co.za',
    phone: '+27 11 482 1039',
    notes: 'Premium Johannesburg catering & high high-end corporate events.'
  },
  {
    id: 'client-2',
    name: 'Corinne',
    contact: 'Corinne van der Byl',
    email: 'corinne@vanderbyl.co.za',
    phone: '+27 82 443 2191',
    notes: 'Exclusive weddings and executive private affairs.'
  },
  {
    id: 'client-3',
    name: 'Fresh Yumm',
    contact: 'Thapelo Molopo',
    email: 'orders@freshyumm.co.za',
    phone: '+27 11 706 8283',
    notes: 'Artisanal foods service sponsor. VIP hostesses expected.'
  },
  {
    id: 'client-4',
    name: 'STAY BY INIMITABLE',
    contact: 'Jessica Botha',
    email: 'stay@inimitable.co.za',
    phone: '+27 10 023 9011',
    notes: 'Luxury villas in Muldersdrift booking hostesses for guest check-ins.'
  },
  {
    id: 'client-5',
    name: 'INIMITABLE',
    contact: 'John-Michael Botha',
    email: 'events@inimitable.co.za',
    phone: '+27 10 023 9000',
    notes: 'Stunning premium wedding/event venue in Muldersdrift. Demands elite mixology & VIP architects.'
  },
  {
    id: 'client-6',
    name: 'Rimac',
    contact: 'Mate Rimac',
    email: 'press@rimac-automobili.com',
    phone: '+385 1 563 4500',
    notes: 'Supercar launch in Sandton. Exclusive hostesses with driver liaison experience.'
  },
  {
    id: 'client-7',
    name: 'Mizana',
    contact: 'Fariqa Seedat',
    email: 'info@mizanamarket.co.za',
    phone: '+27 83 998 0122',
    notes: 'High fashion & luxury lifestyle marketplace curation.'
  },
  {
    id: 'client-8',
    name: 'MYS Agency',
    contact: 'Ayanda Khanyile',
    email: 'ayanda@mysagency.co.za',
    phone: '+27 11 391 8021',
    notes: 'Boutique brand representation in Rosebank.'
  },
  {
    id: 'client-9',
    name: 'Fhulufhelani',
    contact: 'Fhulufhelani Netshidzivhe',
    email: 'fhulu@freshpeople.co.za',
    phone: '+27 72 498 1234',
    notes: 'VVIP South African corporate leadership roundtables.'
  },
  {
    id: 'client-rma',
    name: 'RMA Group',
    contact: 'RMA Coordinator',
    email: 'info@rma.co.za',
    phone: '+27 11 543 9000',
    notes: 'Rand Mutual Assurance corporate client.'
  },
  {
    id: 'client-motseng',
    name: 'Motseng Concessions',
    contact: 'Motseng Manager',
    email: 'info@motseng.co.za',
    phone: '+27 11 234 5678',
    notes: 'Key South African logistics and facility management client.'
  },
  {
    id: 'client-etv',
    name: 'e.tv Television Network',
    contact: 'e.tv Producer',
    email: 'production@etv.co.za',
    phone: '+27 11 537 9300',
    notes: 'National media and broadcaster studios.'
  },
  {
    id: 'client-sanofi',
    name: 'Sanofi Multinational',
    contact: 'Sanofi Coordinator',
    email: 'events@sanofi.com',
    phone: '+27 11 256 0000',
    notes: 'Global healthcare partnership coordinator.'
  },
  {
    id: 'client-mast',
    name: 'MAST Fre Minds',
    contact: 'MAST Coordinator',
    email: 'info@mast.co.za',
    phone: '+27 82 555 1212',
    notes: 'Special event coordination and program team.'
  },
  {
    id: 'client-omphile',
    name: 'Omphile Letshwiti Private',
    contact: 'Omphile Letshwiti',
    email: 'omphile@letshwiti.com',
    phone: '+27 73 112 3456',
    notes: 'Private executive dining host.'
  }
];

export const INITIAL_VENUES: Venue[] = [
  {
    id: 'venue-1',
    name: 'INIMITABLE Wedding Venue',
    address: 'Place No. 1, Muldersdrift, Johannesburg, 1739',
    capacity: 400,
    tier: 'Luxury Class',
    notes: 'World-class structural steel design surrounded by willow trees. Elite grade requirements.'
  },
  {
    id: 'venue-2',
    name: 'STAY BY INIMITABLE',
    address: 'Kloof Road, Muldersdrift, South Africa, 1739',
    capacity: 60,
    tier: 'Premium Estate',
    notes: 'Ultra-exclusive private forest estate accommodation adjacent to Crocodile River.'
  },
  {
    id: 'venue-3',
    name: 'Sandton Convention Centre',
    address: 'Maud St, Sandridge, Sandton, 2196',
    capacity: 1500,
    tier: 'Luxury Class',
    notes: "South Africa's premier multi-purpose exhibition center."
  },
  {
    id: 'venue-4',
    name: 'The Westcliff Rose Garden',
    address: 'Jan Smuts Avenue, Westcliff, Johannesburg, 2193',
    capacity: 250,
    tier: 'Premium Estate',
    notes: 'Panoramas of Johannesburg Zoo and the city forest canopy.'
  },
  {
    id: 'venue-rma',
    name: 'RMA Office Premises',
    address: 'Rand Mutual, Johannesburg Central, South Africa',
    capacity: 150,
    tier: 'Corporate Hub',
    notes: 'State-of-the-art office spaces and corporate boardrooms.'
  },
  {
    id: 'venue-motseng',
    name: 'Motseng Head Office',
    address: 'Motseng Building, Johannesburg, South Africa',
    capacity: 100,
    tier: 'Premium Estate',
    notes: 'VIP dining and board banquet rooms.'
  },
  {
    id: 'venue-etv',
    name: 'e.tv Hyde Park Studios',
    address: 'Albury Road, Hyde Park, Johannesburg, South Africa',
    capacity: 300,
    tier: 'Media Hub',
    notes: 'High definition broadcasting studios and lounge areas.'
  },
  {
    id: 'venue-sanofi',
    name: 'Sanofi Corporate HQ',
    address: 'Sanofi Office Park, Midrand, Johannesburg',
    capacity: 200,
    tier: 'Corporate Hub',
    notes: 'Sleek executive conference spaces.'
  },
  {
    id: 'venue-tbc',
    name: 'TBC Location (Corporate)',
    address: 'To Be Confirmed, South Africa',
    capacity: 100,
    tier: 'Premium Estate',
    notes: 'Event location confirmation pending closer to date.'
  }
];

export const INITIAL_STAFF: Staff[] = [
  {
    id: 'staff-1',
    name: 'Sophie',
    surname: 'Laurent',
    role: 'Lead VIP Architect',
    rate: 350,
    phone: '+276****1012',
    email: 'sophie@freshpeople.co.za',
    notes: 'Speaks fluent English, French and Zulu. Highly experienced with executive protocols.'
  },
  {
    id: 'staff-2',
    name: 'Thabo',
    surname: 'Mokoena',
    role: 'Elite Mixologist',
    rate: 300,
    phone: '+277****0293',
    email: 'thabo@freshpeople.co.za',
    notes: 'Custom cocktail menu designer and signature beverage expert.'
  },
  {
    id: 'staff-3',
    name: 'Lerato',
    surname: 'Dlamini',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+276****5678',
    email: 'lerato@freshpeople.co.za',
    notes: 'Represented luxury fashion brands at Rosebank Rose Festival.'
  },
  {
    id: 'staff-4',
    name: 'Pieter',
    surname: 'de Wet',
    role: 'Private Sommelier',
    rate: 380,
    phone: '+278****1982',
    email: 'pieter@freshpeople.co.za',
    notes: 'Cape Wine Master certified. Deep pairing expertise.'
  },
  {
    id: 'staff-5',
    name: 'Zola',
    surname: 'Sibanda',
    role: 'Service Supervisor',
    rate: 280,
    phone: '+276****3110',
    email: 'zola@freshpeople.co.za',
    notes: 'Over 8 years managing high density wedding protocols.'
  },
  {
    id: 'staff-6',
    name: 'Chantal',
    surname: 'Ndlovu',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+277****4439',
    email: 'chantal@freshpeople.co.za',
    notes: 'Expert interpersonal skills.'
  },
  {
    id: 'staff-7',
    name: 'Sipho',
    surname: 'Khumalo',
    role: 'Safety Concierge',
    rate: 250,
    phone: '+276****3184',
    email: 'sipho@freshpeople.co.za',
    notes: 'First aid certified, advance security crowd management protocols.'
  },
  {
    id: 'staff-8',
    name: 'Keisha',
    surname: 'Naidoo',
    role: 'Corporate Hostess',
    rate: 230,
    phone: '+278****4910',
    email: 'keisha@freshpeople.co.za',
    notes: 'Highly organized with flawless check-in gate administration.'
  },
  {
    id: 'staff-9',
    name: 'Francois',
    surname: 'du Plessis',
    role: 'Elite Mixologist',
    rate: 300,
    phone: '+278****2049',
    email: 'francois@freshpeople.co.za',
    notes: 'Passionate craft beverage designer.'
  },
  {
    id: 'staff-10',
    name: 'Nomvula',
    surname: 'Radebe',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+277****4566',
    email: 'nomvula@freshpeople.co.za',
    notes: 'Speaks Sotho and Zulu; welcoming attitude.'
  },
  {
    id: 'staff-11',
    name: 'Brandon',
    surname: 'Pillay',
    role: 'Service Supervisor',
    rate: 280,
    phone: '+278****8290',
    email: 'brandon@freshpeople.co.za',
    notes: 'Specialist in French-style banquet services.'
  },
  {
    id: 'staff-12',
    name: 'Fatima',
    surname: 'Cassim',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+276****1092',
    email: 'fatima@freshpeople.co.za',
    notes: 'Experienced in international diplomatic delegation hosts.'
  },
  {
    id: 'staff-13',
    name: 'Sibusiso',
    surname: 'Zulu',
    role: 'Safety Concierge',
    rate: 250,
    phone: '+277****8214',
    email: 'sibusiso@freshpeople.co.za',
    notes: 'Close protection specialist; handles perimeter coordination.'
  },
  {
    id: 'staff-14',
    name: 'Anika',
    surname: 'Smit',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+278****0245',
    email: 'anika@freshpeople.co.za',
    notes: 'Enthusiastic event host.'
  },
  {
    id: 'staff-15',
    name: 'Kgomotso',
    surname: 'Taylor',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+276****1044',
    email: 'kgomotso@freshpeople.co.za',
    notes: 'Excellent team communication.'
  },
  {
    id: 'staff-16',
    name: 'Devon',
    surname: 'van der Merwe',
    role: 'Elite Mixologist',
    rate: 300,
    phone: '+277****2309',
    email: 'devon@freshpeople.co.za',
    notes: 'Expert in molecular custom cocktails.'
  },
  {
    id: 'staff-17',
    name: 'Naledi',
    surname: 'Molefe',
    role: 'Private Sommelier',
    rate: 380,
    phone: '+278****9104',
    email: 'naledi@freshpeople.co.za',
    notes: 'Deep vintage knowledge, South African winery specialist.'
  },
  {
    id: 'staff-18',
    name: 'Wandile',
    surname: 'Ndlela',
    role: 'Service Supervisor',
    rate: 280,
    phone: '+276****8491',
    email: 'wandile@freshpeople.co.za',
    notes: 'Focused on seamless culinary delivery.'
  },
  {
    id: 'staff-19',
    name: 'Kiara',
    surname: 'Govender',
    role: 'Corporate Hostess',
    rate: 230,
    phone: '+278****9203',
    email: 'kiara@freshpeople.co.za',
    notes: 'Graceful hospitality operator.'
  },
  {
    id: 'staff-20',
    name: 'Tshepo',
    surname: 'Mashaba',
    role: 'Safety Concierge',
    rate: 250,
    phone: '+277****1289',
    email: 'tshepo@freshpeople.co.za',
    notes: 'Safety-first mindset, emergency exit control officer.'
  },
  {
    id: 'staff-21',
    name: 'Elize',
    surname: 'Botha',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+278****0294',
    email: 'elize@freshpeople.co.za',
    notes: 'Flawless corporate event and registry host.'
  },
  {
    id: 'staff-22',
    name: 'Fhulufhelani',
    surname: 'Netshidzivhe',
    role: 'Lead VIP Architect',
    rate: 360,
    phone: '+277****1122',
    email: 'fhulu@freshpeople.co.za',
    notes: 'Expert executive protocol manager with extensive national leadership relations.'
  }
];

export const INITIAL_EVENTS: Event[] = [
  {
    id: 'event-rma-breakfast',
    title: 'RMA Khw breakfast',
    clientId: 'client-rma',
    venueId: 'venue-rma',
    date: '2026-05-25',
    startTime: '08:00',
    endTime: '15:00',
    staffIds: ['staff-1', 'staff-3', 'staff-4', 'staff-15'],
    notes: 'Corporate catering and VIP breakfast protocol management at RMA Premises.',
    status: 'Confirmed'
  },
  {
    id: 'event-motseng-breakfast',
    title: 'Motseng breakfast and lunch',
    clientId: 'client-motseng',
    venueId: 'venue-motseng',
    date: '2026-05-25',
    startTime: '08:00',
    endTime: '14:30',
    staffIds: ['staff-2', 'staff-5', 'staff-6'],
    notes: 'Premium breakfast and lunch banquet. Facilitation and executive hospitality setup.',
    status: 'Confirmed'
  },
  {
    id: 'event-rma-dolly',
    title: 'RMA Dolly/Mali',
    clientId: 'client-rma',
    venueId: 'venue-rma',
    date: '2026-05-26',
    startTime: '08:00',
    endTime: '15:00',
    staffIds: ['staff-8', 'staff-10'],
    notes: 'Rand Mutual Dolly and Mali partner sessions. Allocated corporate hosts.',
    status: 'Confirmed'
  },
  {
    id: 'event-etv-28',
    title: 'ETV Showcase',
    clientId: 'client-etv',
    venueId: 'venue-etv',
    date: '2026-05-28',
    startTime: '08:00',
    endTime: '09:00',
    staffIds: ['staff-3'],
    notes: 'Bespoke corporate television brief on-site helper.',
    status: 'Confirmed'
  },
  {
    id: 'event-sanofi-asthma',
    title: 'Sanofi ICDT & World Asthma Day',
    clientId: 'client-sanofi',
    venueId: 'venue-sanofi',
    date: '2026-05-28',
    startTime: '10:00',
    endTime: '15:00',
    staffIds: ['staff-1', 'staff-15', 'staff-22'],
    notes: 'Sponsorship and health awareness gala. 3 active expert VIP hostesses allocated.',
    status: 'Confirmed'
  },
  {
    id: 'event-mast-minds',
    title: 'MAST Fre Minds eve',
    clientId: 'client-mast',
    venueId: 'venue-tbc',
    date: '2026-05-29',
    startTime: '08:00',
    endTime: '16:00',
    staffIds: ['staff-12', 'staff-21'],
    notes: 'Fre Minds evening celebration and team lead briefing.',
    status: 'Confirmed'
  },
  {
    id: 'event-etv-29',
    title: 'ETV',
    clientId: 'client-etv',
    venueId: 'venue-etv',
    date: '2026-05-29',
    startTime: '08:00',
    endTime: '09:00',
    staffIds: ['staff-4'],
    notes: 'Daily media coordination briefing assistance.',
    status: 'Confirmed'
  },
  {
    id: 'event-omphile-lunch',
    title: 'Omphile Letshwiti Lunch',
    clientId: 'client-omphile',
    venueId: 'venue-tbc',
    date: '2026-05-30',
    startTime: '11:30',
    endTime: '13:30',
    staffIds: ['staff-2'],
    notes: 'Exclusive private dining support and direct mixology.',
    status: 'Confirmed'
  }
];
