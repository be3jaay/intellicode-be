import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'teacher',
      student_number: 'TEST001'
    }
  });

  console.log('✅ Test user created:', testUser.email);

  // Create a test student
  const testStudent = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'student@example.com',
      first_name: 'Test',
      last_name: 'Student',
      role: 'student',
      student_number: 'STU001'
    }
  });

  console.log('✅ Test student created:', testStudent.email);

  // Create a test admin
  const testAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'admin@example.com',
      first_name: 'Test',
      last_name: 'Admin',
      role: 'admin',
      student_number: 'ADM001'
    }
  });

  console.log('✅ Test admin created:', testAdmin.email);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
