require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');

// Import models
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Slot = require('./models/Slot');
const Review = require('./models/Review');
const LabTest = require('./models/LabTest');
const Emergency = require('./models/Emergency');
const Clinic = require('./models/Clinic');
const Prescription = require('./models/Prescription');
const HealthRecord = require('./models/HealthRecord');
const Appointment = require('./models/Appointment');

const { hashPassword, generateId, formatDate, addDays, generateBookingId } = require('./utils/helpers');

const seedData = async () => {
  try {
    // Connect to database
    await mongoose.connect(config.mongoUrl, {
      dbName: config.dbName,
    });
    logger.info('Connected to database for seeding');

    // Force re-seed demo data
    logger.info('Forcing re-seed of demo data');
    await Doctor.deleteMany({ id: { $in: ['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5', 'doc-6'] } });
    await Slot.deleteMany({ doctor_id: { $in: ['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5', 'doc-6'] } });
    await Review.deleteMany({ doctor_id: { $in: ['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5', 'doc-6'] } });
    await LabTest.deleteMany({ id: { $in: ['lab-1', 'lab-2', 'lab-3', 'lab-4', 'lab-5', 'lab-6', 'lab-7', 'lab-8'] } });
    await Emergency.deleteMany({ id: { $in: ['em-1', 'em-2', 'em-3', 'em-4', 'em-5', 'em-6', 'em-7', 'em-8'] } });
    await Clinic.deleteMany({ id: { $in: ['clinic-1', 'clinic-2'] } });
    // Clean up leftover test users from test suites
    await User.deleteMany({ email: { $regex: /^(test-recep|walkin-)/ } });

    
    // Clear Redis cache
    try {
      const redis = require('./config/redis');
      await redis.delPattern('doctors:*');
      await redis.delPattern('slots:*');
      await redis.delPattern('specialties');
      await redis.delPattern('lab_tests:*');
      await redis.delPattern('emergency:*');
      logger.info('Redis cache cleared');
    } catch (error) {
      logger.warn('Failed to clear Redis cache:', error.message);
    }

    logger.info('Starting seed data population...');

    // Seed Doctors
    const doctors = [
      {
        id: 'doc-1',
        name: 'Dr. Ram Sharma',
        specialty: 'Cardiologist',
        gender: 'male',
        qualification: 'MBBS, MD Cardiology',
        experience_years: 12,
        languages: ['English', 'Nepali', 'Hindi'],
        clinic_name: 'Janakpur Heart Clinic',
        clinic_address: 'Station Rd, Janakpurdham',
        consultation_fee: 800,
        rating: 4.8,
        review_count: 128,
        online_consult: true,
        photo_url: 'https://images.unsplash.com/photo-1612349316228-5942a9b489c2?w=400&q=80',
        about: 'Senior cardiologist with 12+ years of experience treating heart conditions across the Terai region.',
      },
      {
        id: 'doc-2',
        name: 'Dr. Sita Karki',
        specialty: 'Pediatrician',
        gender: 'female',
        qualification: 'MBBS, DCH',
        experience_years: 8,
        languages: ['English', 'Nepali', 'Maithili'],
        clinic_name: 'Janakpur Children\'s Clinic',
        clinic_address: 'Ramanand Chowk, Janakpurdham',
        consultation_fee: 600,
        rating: 4.9,
        review_count: 210,
        online_consult: true,
        photo_url: 'https://images.unsplash.com/photo-1659353888906-adb3e0041693?w=400&q=80',
        about: 'Compassionate pediatrician specialising in newborn and adolescent care.',
      },
      {
        id: 'doc-3',
        name: 'Dr. Anish Yadav',
        specialty: 'Dermatologist',
        gender: 'male',
        qualification: 'MBBS, MD Dermatology',
        experience_years: 6,
        languages: ['English', 'Nepali', 'Hindi', 'Maithili'],
        clinic_name: 'Skin & Care Clinic',
        clinic_address: 'Bhanu Chowk, Janakpurdham',
        consultation_fee: 700,
        rating: 4.6,
        review_count: 94,
        online_consult: true,
        photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
        about: 'Board-certified dermatologist focused on acne, eczema, and cosmetic dermatology.',
      },
      {
        id: 'doc-4',
        name: 'Dr. Puja Thakur',
        specialty: 'Gynaecologist',
        gender: 'female',
        qualification: 'MBBS, MS OBG',
        experience_years: 10,
        languages: ['English', 'Nepali', 'Maithili'],
        clinic_name: 'Mithila Women\'s Health',
        clinic_address: 'Zero Mile, Janakpurdham',
        consultation_fee: 900,
        rating: 4.7,
        review_count: 156,
        online_consult: false,
        photo_url: 'https://images.unsplash.com/photo-1594824388853-2c5899d3e1e0?w=400&q=80',
        about: 'OBGYN with a decade of experience in maternal health and gynaecological surgery.',
      },
      {
        id: 'doc-5',
        name: 'Dr. Bikash Mahato',
        specialty: 'General Physician',
        gender: 'male',
        qualification: 'MBBS',
        experience_years: 5,
        languages: ['English', 'Nepali', 'Hindi'],
        clinic_name: 'Janakpur General Clinic',
        clinic_address: 'Murli Chowk, Janakpurdham',
        consultation_fee: 500,
        rating: 4.5,
        review_count: 72,
        online_consult: true,
        photo_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80',
        about: 'General practitioner for fever, infections, and preventive check-ups.',
      },
      {
        id: 'doc-6',
        name: 'Dr. Meera Jha',
        specialty: 'Orthopedic',
        gender: 'female',
        qualification: 'MBBS, MS Ortho',
        experience_years: 11,
        languages: ['English', 'Nepali'],
        clinic_name: 'Janakpur Bone & Joint',
        clinic_address: 'Bidhyapati Chowk, Janakpurdham',
        consultation_fee: 1000,
        rating: 4.8,
        review_count: 143,
        online_consult: false,
        photo_url: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80',
        about: 'Orthopedic surgeon specialising in joint replacement and sports injuries.',
      },
    ];

    await Doctor.insertMany(doctors);
    logger.info(`Seeded ${doctors.length} doctors`);

    // Seed Slots for next 5 days
    const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00'];
    const slots = [];

    for (const doctor of doctors) {
      for (let day = 0; day < 5; day++) {
        const date = formatDate(addDays(new Date(), day));
        for (const time of times) {
          slots.push({
            id: generateId(),
            doctor_id: doctor.id,
            date,
            time,
            is_booked: Math.random() < 0.25,
          });
        }
      }
    }

    await Slot.insertMany(slots);
    logger.info(`Seeded ${slots.length} slots`);

    // Seed Reviews
    const reviews = [
      {
        id: generateId(),
        doctor_id: 'doc-1',
        patient_id: 'patient-demo',
        patient_name: 'Ramesh K.',
        rating: 5,
        comment: 'Excellent doctor, took time to explain everything.',
      },
      {
        id: generateId(),
        doctor_id: 'doc-2',
        patient_id: 'patient-2',
        patient_name: 'Anita S.',
        rating: 5,
        comment: 'My child felt very comfortable with her.',
      },

      {
        id: generateId(),
        doctor_id: 'doc-3',
        patient_id: 'patient-demo',
        patient_name: 'Kiran T.',
        rating: 4,
        comment: 'Good consultation, saw results in 2 weeks.',
      },
      {
        id: generateId(),
        doctor_id: 'doc-4',
        patient_id: 'patient-demo',
        patient_name: 'Manisha Y.',
        rating: 5,
        comment: 'Very professional and caring.',
      },
    ];

    for (const review of reviews) {
      const existing = await Review.findOne({ doctor_id: review.doctor_id, patient_id: review.patient_id });
      if (!existing) {
        await Review.create(review);
      }
    }
    logger.info(`Seeded ${reviews.length} reviews`);

    // Seed Lab Tests
    const labTests = [
      {
        id: 'lab-1',
        name: 'Complete Blood Count (CBC)',
        category: 'Blood',
        price: 450,
        home_collection: true,
        turnaround_hours: 6,
        description: 'Comprehensive blood analysis for overall health screening.',
      },
      {
        id: 'lab-2',
        name: 'Lipid Profile',
        category: 'Blood',
        price: 800,
        home_collection: true,
        turnaround_hours: 8,
        description: 'Cholesterol and triglycerides measurement.',
      },
      {
        id: 'lab-3',
        name: 'Fasting Blood Sugar',
        category: 'Blood',
        price: 200,
        home_collection: true,
        turnaround_hours: 4,
        description: 'Blood glucose after 8 hours of fasting.',
      },
      {
        id: 'lab-4',
        name: 'Thyroid (TSH, T3, T4)',
        category: 'Hormone',
        price: 1200,
        home_collection: true,
        turnaround_hours: 12,
        description: 'Full thyroid function panel.',
      },
      {
        id: 'lab-5',
        name: 'Urine Routine',
        category: 'Urine',
        price: 250,
        home_collection: true,
        turnaround_hours: 6,
        description: 'General urine analysis.',
      },
      {
        id: 'lab-6',
        name: 'Chest X-Ray',
        category: 'Imaging',
        price: 700,
        home_collection: false,
        turnaround_hours: 2,
        description: 'X-ray of chest to check lungs and heart.',
      },
      {
        id: 'lab-7',
        name: 'ECG',
        category: 'Imaging',
        price: 500,
        home_collection: false,
        turnaround_hours: 1,
        description: 'Electrocardiogram to check heart rhythm.',
      },
      {
        id: 'lab-8',
        name: 'Ultrasound (Abdomen)',
        category: 'Imaging',
        price: 1500,
        home_collection: false,
        turnaround_hours: 3,
        description: 'Ultrasound scan of abdominal organs.',
      },
    ];

    await LabTest.insertMany(labTests);
    logger.info(`Seeded ${labTests.length} lab tests`);

    // Seed Emergency Contacts
    const emergencies = [
      {
        id: 'em-1',
        name: 'Janakpur Zonal Hospital',
        type: 'hospital',
        phone: '041-520133',
        address: 'Janakpurdham, Dhanusha',
        distance_km: 1.2,
        open_24_7: true,
      },
      {
        id: 'em-2',
        name: 'Provincial Hospital Janakpur',
        type: 'hospital',
        phone: '041-520222',
        address: 'Bhanu Chowk, Janakpurdham',
        distance_km: 2.4,
        open_24_7: true,
      },
      {
        id: 'em-3',
        name: 'Manakamana Hospital',
        type: 'hospital',
        phone: '041-521234',
        address: 'Mills Area, Janakpurdham',
        distance_km: 3.1,
        open_24_7: true,
      },
      {
        id: 'em-4',
        name: 'Nepal Ambulance Service',
        type: 'ambulance',
        phone: '102',
        address: 'Available city-wide',
        distance_km: 0,
        open_24_7: true,
      },
      {
        id: 'em-5',
        name: 'Red Cross Ambulance',
        type: 'ambulance',
        phone: '041-520100',
        address: 'Red Cross Chowk, Janakpurdham',
        distance_km: 1.8,
        open_24_7: true,
      },
      {
        id: 'em-6',
        name: 'Janakpur Blood Bank',
        type: 'blood_bank',
        phone: '041-520567',
        address: 'Hospital Rd, Janakpurdham',
        distance_km: 1.5,
        open_24_7: true,
      },
      {
        id: 'em-7',
        name: 'Red Cross Blood Bank',
        type: 'blood_bank',
        phone: '041-520100',
        address: 'Red Cross Chowk, Janakpurdham',
        distance_km: 1.8,
        open_24_7: true,
      },
      {
        id: 'em-8',
        name: 'Nepal Police Emergency',
        type: 'police',
        phone: '100',
        address: 'City-wide emergency',
        distance_km: 0,
        open_24_7: true,
      },
    ];

    await Emergency.insertMany(emergencies);
    logger.info(`Seeded ${emergencies.length} emergency contacts`);

    // Seed Clinics
    const clinics = [
      {
        id: 'clinic-1',
        name: 'Janakpur Heart Clinic',
        address: 'Station Rd, Janakpurdham',
        phone: '041-520200',
        admin_user_id: 'clinic-admin-1',
        doctor_ids: ['doc-1', 'doc-5'],
        departments: ['Cardiology', 'General Medicine'],
      },
      {
        id: 'clinic-2',
        name: 'Mithila Family Clinic',
        address: 'Ramanand Chowk, Janakpurdham',
        phone: '041-520201',
        admin_user_id: 'clinic-admin-2',
        doctor_ids: ['doc-2', 'doc-4'],
        departments: ['Paediatrics', 'Gynaecology'],
      },
    ];

    await Clinic.insertMany(clinics);
    logger.info(`Seeded ${clinics.length} clinics`);

    // Seed Demo Users
    await ensureDemoUsers();

    // Seed Demo Prescriptions
    const patient = await User.findOne({ email: 'patient@hamrodoctor.np' });
    if (patient) {
      const prescriptions = [
        {
          id: generateId(),
          patient_id: patient.id,
          doctor_id: 'doc-5',
          doctor_name: 'Dr. Bikash Mahato',
          doctor_specialty: 'General Physician',
          diagnosis: 'Viral Fever',
          symptoms: ['Fever', 'Body ache', 'Headache'],
          medicines: [
            {
              name: 'Paracetamol 500mg',
              dosage: '1-0-1',
              duration: '5 days',
              instructions: 'After food',
            },
            {
              name: 'Vitamin C 500mg',
              dosage: '1-0-0',
              duration: '7 days',
              instructions: 'With water',
            },
          ],
          follow_up_date: formatDate(addDays(new Date(), 7)),
          notes: 'Rest well and drink plenty of fluids.',
        },
        {
          id: generateId(),
          patient_id: patient.id,
          doctor_id: 'doc-3',
          doctor_name: 'Dr. Anish Yadav',
          doctor_specialty: 'Dermatologist',
          diagnosis: 'Mild Eczema',
          symptoms: ['Itching', 'Red patches on arms'],
          medicines: [
            {
              name: 'Hydrocortisone Cream',
              dosage: 'Apply twice daily',
              duration: '10 days',
              instructions: 'On affected area only',
            },
            {
              name: 'Cetirizine 10mg',
              dosage: '0-0-1',
              duration: '5 days',
              instructions: 'At night',
            },
          ],
          notes: 'Avoid hot showers and use moisturiser.',
        },
      ];

      await Prescription.insertMany(prescriptions);
      logger.info(`Seeded ${prescriptions.length} prescriptions`);

      // Seed Health Records
      const records = [
        {
          id: generateId(),
          patient_id: patient.id,
          type: 'prescription',
          title: 'Viral Fever - Rx',
          description: 'Prescription from Dr. Bikash Mahato',
          doctor_name: 'Dr. Bikash Mahato',
          date: formatDate(addDays(new Date(), -3)),
        },
        {
          id: generateId(),
          patient_id: patient.id,
          type: 'lab_report',
          title: 'Complete Blood Count',
          description: 'All parameters within normal range',
          doctor_name: 'Janakpur Diagnostic Lab',
          date: formatDate(addDays(new Date(), -10)),
        },
        {
          id: generateId(),
          patient_id: patient.id,
          type: 'x_ray',
          title: 'Chest X-Ray',
          description: 'Clear, no abnormalities',
          doctor_name: 'Janakpur Zonal Hospital',
          date: formatDate(addDays(new Date(), -45)),
        },
        {
          id: generateId(),
          patient_id: patient.id,
          type: 'vaccination',
          title: 'COVID-19 Booster',
          description: '3rd dose administered',
          doctor_name: 'Provincial Hospital',
          date: formatDate(addDays(new Date(), -120)),
        },
        {
          id: generateId(),
          patient_id: patient.id,
          type: 'ecg',
          title: 'ECG Report',
          description: 'Normal sinus rhythm',
          doctor_name: 'Janakpur Heart Clinic',
          date: formatDate(addDays(new Date(), -200)),
        },
      ];

      await HealthRecord.insertMany(records);
      logger.info(`Seeded ${records.length} health records`);
    }

    // Seed Demo Appointment
    await ensureDemoDoctorAppointments();

    logger.info('Seed data completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error('Seed data failed:', error);
    process.exit(1);
  }
};

async function ensureDemoUsers() {
  const demoUsers = [
    {
      id: 'patient-demo',
      full_name: 'Aayush Sharma',
      email: 'patient@hamrodoctor.np',
      phone: '+9779812345678',
      password_hash: await hashPassword('Patient@123'),
      role: 'patient',
      is_verified: true,
      language: 'en',
    },
    {
      id: 'doctor-demo',
      full_name: 'Dr. Ram Sharma',
      email: 'doctor@hamrodoctor.np',
      phone: '+9779811111111',
      password_hash: await hashPassword('Doctor@123'),
      role: 'doctor',
      is_verified: true,
      doctor_id: 'doc-1',
      language: 'en',
    },
    {
      id: 'clinic-admin-1',
      full_name: 'Rajesh Yadav',
      email: 'admin@heartclinic.np',
      phone: '+9779822222222',
      password_hash: await hashPassword('Admin@123'),
      role: 'clinic_admin',
      is_verified: true,
      clinic_id: 'clinic-1',
      language: 'en',
    },
    {
      id: 'recep-1',
      full_name: 'Priya Thakur',
      email: 'reception@heartclinic.np',
      phone: '+9779833333333',
      password_hash: await hashPassword('Recep@123'),
      role: 'receptionist',
      is_verified: true,
      clinic_id: 'clinic-1',
      language: 'en',
    },
    {
      id: 'lab-admin-1',
      full_name: 'Suman Karki',
      email: 'lab@hamrodoctor.np',
      phone: '+9779844444444',
      password_hash: await hashPassword('Lab@123'),
      role: 'lab_admin',
      is_verified: true,
      language: 'en',
    },
    {
      id: 'super-admin-1',
      full_name: 'Curovya Admin',
      email: 'super@hamrodoctor.np',
      phone: '+9779855555555',
      password_hash: await hashPassword('Super@123'),
      role: 'super_admin',
      is_verified: true,
      language: 'en',
    },
    {
      id: 'super-admin-2',
      full_name: 'System Admin',
      email: 'admin@hamrodoctor.np',
      phone: '+9779855555556',
      password_hash: await hashPassword('Admin@123'),
      role: 'super_admin',
      is_verified: true,
      language: 'en',
    },
  ];

  for (const user of demoUsers) {
    await User.findOneAndUpdate({ email: user.email }, user, { upsert: true, new: true });
    logger.info(`Upserted demo user: ${user.email}`);
  }

}

async function ensureDemoDoctorAppointments() {
  const doctor = await Doctor.findOne({ id: 'doc-1' });
  const patient = await User.findOne({ email: 'patient@hamrodoctor.np' });

  if (doctor && patient) {
    const today = formatDate(new Date());
    const todayCount = await Appointment.countDocuments({ doctor_id: doctor.id, date: today });

    if (todayCount < 3) {
      const times = ['09:00', '10:30', '14:00', '15:30'];
      const needed = 3 - todayCount;

      for (let i = 0; i < needed; i++) {
        const appointment = await Appointment.create({
          id: generateId(),
          booking_id: generateBookingId(),
          token_number: i + 1,
          patient_id: patient.id,
          doctor_id: doctor.id,
          doctor_name: doctor.name,
          doctor_specialty: doctor.specialty,
          doctor_photo_url: doctor.photo_url,
          clinic_name: doctor.clinic_name,
          clinic_address: doctor.clinic_address,
          date: today,
          time: times[i],
          consultation_type: 'clinic',
          consultation_fee: doctor.consultation_fee,
          payment_method: 'esewa',
          status: 'confirmed',
          current_serving: Math.max(1, i),
        });
        logger.info(`Created demo appointment for ${times[i]}`);
      }
    }
  }
}

module.exports = { seedData, ensureDemoUsers, ensureDemoDoctorAppointments };

if (require.main === module) {
  seedData();
}

