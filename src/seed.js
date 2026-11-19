/**
 * Safe, idempotent seed script for MentorLagbe.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD='StrongPass123!' npm run seed
 *
 * Creates the first admin (from env), demo tutors/students, 12 approved
 * tuitions, a few pending listings, applications and payments.
 * Running it again will not duplicate data.
 */
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const { connectDB, getDB, closeDB } = await import("./config/db.js");
const { createAuth } = await import("./config/auth.js");

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Password123!";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const IMG = {
  math: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
  physics:
    "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80",
  programming:
    "https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=1200&q=80",
  ielts:
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80",
  chemistry:
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
  english:
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80",
  biology:
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
  accounting:
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
  speaking:
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
  olympiad:
    "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1200&q=80",
  classroom:
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
  react:
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80",
};

const tutors = [
  {
    name: "Ayesha Rahman",
    email: "tutor@mentorlagbe.com",
    phone: "+8801711000101",
    bio: "BUET graduate with 7 years of experience teaching HSC mathematics and programming. I focus on intuition first, then exam technique.",
    plan: "pro",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Farhan Ahmed",
    email: "farhan@mentorlagbe.com",
    phone: "+8801711000102",
    bio: "Physics mentor and national olympiad coach. I help students build problem-solving habits that last beyond the exam.",
    plan: "pro",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Nusrat Jahan",
    email: "nusrat@mentorlagbe.com",
    phone: "+8801711000103",
    bio: "IELTS 8.5 and English communication coach. My classes are interactive, practical and built around each learner's goals.",
    plan: "free",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Tanvir Hasan",
    email: "tanvir@mentorlagbe.com",
    phone: "+8801711000104",
    bio: "Medical admission mentor and biology specialist. I teach with diagrams, memory hooks and weekly written tests.",
    plan: "free",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  },
];

const students = [
  {
    name: "Rafiul Islam",
    email: "student@mentorlagbe.com",
    phone: "+8801811000201",
    plan: "free",
    image:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Mim Akter",
    email: "mim@mentorlagbe.com",
    phone: "+8801811000202",
    plan: "pro",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Saad Karim",
    email: "saad@mentorlagbe.com",
    phone: "+8801811000203",
    plan: "free",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  },
];

const tuitionSeed = [
  {
    title: "Higher Mathematics — Calculus & Algebra",
    subject: "Mathematics",
    classLevel: "Class 11-12",
    mode: "Online",
    location: "Zoom (Bangladesh)",
    monthlyFee: 4500,
    daysPerWeek: 3,
    bannerImage: IMG.math,
    description:
      "A structured HSC mathematics program covering limits, differentiation, integration, vectors and coordinate geometry. Every class includes a concept walkthrough, guided problem solving and a short weekly assessment. Students receive recorded lessons and a curated problem bank.",
    tutorEmail: "tutor@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "Physics for HSC — Concept First",
    subject: "Physics",
    classLevel: "Class 11-12",
    mode: "Offline",
    location: "Dhanmondi, Dhaka",
    monthlyFee: 5000,
    daysPerWeek: 3,
    bannerImage: IMG.physics,
    description:
      "Small-group physics classes built around demonstrations, derivations and exam-style problems. We cover mechanics, waves, electricity and modern physics with weekly written tests and personal feedback on every script.",
    tutorEmail: "farhan@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "Python & Web Development Bootcamp",
    subject: "Programming",
    classLevel: "Class 9-12",
    mode: "Online",
    location: "Google Meet",
    monthlyFee: 6000,
    daysPerWeek: 2,
    bannerImage: IMG.programming,
    description:
      "Learn Python fundamentals, then build real projects with HTML, CSS, JavaScript and React. Each month ends with a portfolio project reviewed live. No prior coding experience is required, only curiosity and consistency.",
    tutorEmail: "tutor@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "IELTS Academic Preparation — Band 7+",
    subject: "IELTS",
    classLevel: "Admission & Test Prep",
    mode: "Online",
    location: "Zoom (Bangladesh)",
    monthlyFee: 7000,
    daysPerWeek: 3,
    bannerImage: IMG.ielts,
    description:
      "A focused IELTS program covering all four modules with twice-weekly speaking practice, writing feedback and full mock tests. Includes a personal study plan, vocabulary tracker and access to a private support group.",
    tutorEmail: "nusrat@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "Chemistry Crash Course for SSC",
    subject: "Chemistry",
    classLevel: "Class 9-10",
    mode: "Offline",
    location: "Nasirabad, Chattogram",
    monthlyFee: 3500,
    daysPerWeek: 2,
    bannerImage: IMG.chemistry,
    description:
      "Revision-first chemistry coaching for SSC candidates. We simplify reactions with visual notes, practise board questions and run monthly model tests. Ideal for students who want to close gaps quickly before exams.",
    tutorEmail: "tanvir@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "English Grammar & Creative Writing",
    subject: "English",
    classLevel: "Class 6-8",
    mode: "Online",
    location: "Zoom (Bangladesh)",
    monthlyFee: 2500,
    daysPerWeek: 2,
    bannerImage: IMG.english,
    description:
      "Build a strong grammar foundation and write with confidence. Lessons combine short explanations, guided practice and weekly writing tasks with personalised corrections. Parents receive a monthly progress note.",
    tutorEmail: "nusrat@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "C++ for Competitive Programming",
    subject: "Programming",
    classLevel: "Class 9-12",
    mode: "Online",
    location: "Discord + Zoom",
    monthlyFee: 5500,
    daysPerWeek: 2,
    bannerImage: IMG.programming,
    description:
      "Master C++ syntax, STL, complexity analysis and core algorithms through weekly contest-style problem sets. Each session ends with a live editorial and a personalised practice list for the following week.",
    tutorEmail: "farhan@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "Biology for Medical Admission",
    subject: "Biology",
    classLevel: "Admission & Test Prep",
    mode: "Offline",
    location: "Mirpur, Dhaka",
    monthlyFee: 6500,
    daysPerWeek: 3,
    bannerImage: IMG.biology,
    description:
      "An intensive medical admission biology course covering the full syllabus with diagram-based learning, daily MCQs and weekly exams. Includes revision sheets and one-to-one mentoring for weak topics.",
    tutorEmail: "tanvir@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "Accounting Fundamentals for HSC",
    subject: "Accounting",
    classLevel: "Class 11-12",
    mode: "Online",
    location: "Zoom (Bangladesh)",
    monthlyFee: 3000,
    daysPerWeek: 2,
    bannerImage: IMG.accounting,
    description:
      "Understand the logic behind debits, credits and financial statements instead of memorising formats. We work through past paper questions, build a formula sheet and practise timed exam sets.",
    tutorEmail: "nusrat@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "Spoken English & Communication",
    subject: "English",
    classLevel: "Class 9-12",
    mode: "Online",
    location: "Google Meet",
    monthlyFee: 3200,
    daysPerWeek: 2,
    bannerImage: IMG.speaking,
    description:
      "A practical speaking course for students who want to express ideas clearly. Weekly role plays, pronunciation drills and recorded feedback help you build fluency without fear of mistakes.",
    tutorEmail: "tutor@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "Physics Olympiad Preparation",
    subject: "Physics",
    classLevel: "Class 9-12",
    mode: "Online",
    location: "Zoom (Bangladesh)",
    monthlyFee: 4800,
    daysPerWeek: 2,
    bannerImage: IMG.olympiad,
    description:
      "Challenge-based physics coaching for olympiad aspirants. We solve non-routine problems, discuss elegant solutions and train students to think from first principles. Weekly problem sets are mandatory.",
    tutorEmail: "farhan@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "Math Problem Solving for Class 8",
    subject: "Mathematics",
    classLevel: "Class 6-8",
    mode: "Offline",
    location: "Zindabazar, Sylhet",
    monthlyFee: 2800,
    daysPerWeek: 2,
    bannerImage: IMG.classroom,
    description:
      "Friendly, confidence-building mathematics classes for middle school students. We strengthen arithmetic, algebra and geometry through games, worked examples and a short weekly quiz.",
    tutorEmail: "tanvir@mentorlagbe.com",
    approvalStatus: "approved",
  },
  {
    title: "SAT Math Intensive",
    subject: "Mathematics",
    classLevel: "Admission & Test Prep",
    mode: "Online",
    location: "Zoom (Bangladesh)",
    monthlyFee: 8000,
    daysPerWeek: 3,
    bannerImage: IMG.math,
    description:
      "An eight-week SAT math sprint with diagnostic tests, targeted drills and full-length practice exams. Suitable for students targeting 700+ in the math section.",
    tutorEmail: "tutor@mentorlagbe.com",
    approvalStatus: "pending",
  },
  {
    title: "Web Design with React & Tailwind",
    subject: "Programming",
    classLevel: "Class 9-12",
    mode: "Online",
    location: "Google Meet",
    monthlyFee: 5000,
    daysPerWeek: 2,
    bannerImage: IMG.react,
    description:
      "Project-based frontend course covering component design, responsive layouts, accessibility and deployment. Students finish with three portfolio-ready projects.",
    tutorEmail: "farhan@mentorlagbe.com",
    approvalStatus: "pending",
  },
  {
    title: "French Language Basics",
    subject: "Languages",
    classLevel: "Class 9-12",
    mode: "Online",
    location: "Zoom (Bangladesh)",
    monthlyFee: 3800,
    daysPerWeek: 2,
    bannerImage: IMG.english,
    description:
      "An introductory French course covering pronunciation, everyday vocabulary and basic conversation. Best suited for absolute beginners.",
    tutorEmail: "nusrat@mentorlagbe.com",
    approvalStatus: "rejected",
  },
];

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function ensureUser(auth, profile, role) {
  const db = getDB();
  let user = await db.collection("users").findOne({ email: profile.email });

  if (!user) {
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: profile.name,
          email: profile.email,
          password: profile.password || DEMO_PASSWORD,
          role: role === "admin" ? "student" : role,
          phone: profile.phone || "",
          bio: profile.bio || "",
        },
      });
      user = result?.user ?? null;
    } catch (error) {
      console.warn(`Could not sign up ${profile.email}: ${error.message}`);
      user = await db.collection("users").findOne({ email: profile.email });
      if (!user) throw error;
    }
  }

  await db.collection("users").updateOne(
    { email: profile.email },
    {
      $set: {
        name: profile.name,
        role,
        plan: profile.plan || "free",
        phone: profile.phone || "",
        bio: profile.bio || "",
        image: profile.image || null,
        emailVerified: true,
        updatedAt: new Date(),
      },
    }
  );

  return db.collection("users").findOne({ email: profile.email });
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running the seed."
    );
  }
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  await connectDB();
  const auth = createAuth();
  const db = getDB();

  console.log("Seeding users...");
  await ensureUser(
    auth,
    {
      name: process.env.ADMIN_NAME || "MentorLagbe Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      plan: "free",
      image: null,
    },
    "admin"
  );

  for (const tutor of tutors) {
    await ensureUser(auth, { ...tutor, password: DEMO_PASSWORD }, "tutor");
  }
  for (const student of students) {
    await ensureUser(auth, { ...student, password: DEMO_PASSWORD }, "student");
  }

  console.log("Seeding tuitions...");
  const tuitions = db.collection("tuitions");
  for (const [index, item] of tuitionSeed.entries()) {
    const tutor = tutors.find((t) => t.email === item.tutorEmail);
    const existing = await tuitions.findOne({ title: item.title });
    if (existing) continue;

    await tuitions.insertOne({
      ...item,
      tutorName: tutor?.name || "MentorLagbe Tutor",
      isActive: true,
      createdAt: daysAgo(index + 2),
      updatedAt: daysAgo(index + 2),
    });
  }

  console.log("Seeding applications...");
  const allTuitions = await tuitions.find({}).toArray();
  const byTitle = new Map(allTuitions.map((t) => [t.title, t]));
  const applications = db.collection("applications");

  const applicationSeed = [
    ["student@mentorlagbe.com", "Higher Mathematics — Calculus & Algebra", "accepted", "Sat–Mon, 7–9 PM", "I want to strengthen calculus before the HSC trial exam.", 2],
    ["student@mentorlagbe.com", "Physics for HSC — Concept First", "pending", "Fri–Sat, 4–6 PM", "I struggle with electricity. Please focus on problem solving.", 4],
    ["student@mentorlagbe.com", "Python & Web Development Bootcamp", "pending", "Tue–Thu, 8–10 PM", "Complete beginner. I can commit 6 hours per week.", 6],
    ["student@mentorlagbe.com", "IELTS Academic Preparation — Band 7+", "rejected", "Weekday mornings", "Targeting band 7.5 for a scholarship application.", 10],
    ["student@mentorlagbe.com", "C++ for Competitive Programming", "pending", "Sat–Sun, 9–11 AM", "I know basic C++ and want to start contests.", 12],
    ["student@mentorlagbe.com", "Accounting Fundamentals for HSC", "pending", "Mon–Wed, 6–8 PM", "Please help me with cash flow statements.", 14],
    ["mim@mentorlagbe.com", "Physics for HSC — Concept First", "accepted", "Fri–Sat, 5–7 PM", "I prefer offline classes in Dhanmondi.", 5],
    ["mim@mentorlagbe.com", "Chemistry Crash Course for SSC", "pending", "Sun–Tue, 5–7 PM", "Need revision support before the test exam.", 7],
    ["mim@mentorlagbe.com", "Spoken English & Communication", "accepted", "Wed–Thu, 8–9:30 PM", "I want to speak confidently in presentations.", 9],
    ["saad@mentorlagbe.com", "Higher Mathematics — Calculus & Algebra", "pending", "Sat–Mon, 8–10 PM", "Interested in the recorded lesson option.", 3],
    ["saad@mentorlagbe.com", "Python & Web Development Bootcamp", "accepted", "Tue–Thu, 7–9 PM", "I have some HTML experience.", 8],
    ["saad@mentorlagbe.com", "Biology for Medical Admission", "pending", "Fri–Sat, 3–6 PM", "Preparing for the medical admission test.", 11],
  ];

  for (const [studentEmail, title, status, schedule, note, day] of applicationSeed) {
    const tuition = byTitle.get(title);
    if (!tuition) continue;
    const student = students.find((s) => s.email === studentEmail);

    await applications.updateOne(
      { tuitionId: tuition._id, studentEmail },
      {
        $setOnInsert: {
          tuitionId: tuition._id,
          tuitionTitle: tuition.title,
          subject: tuition.subject,
          monthlyFee: tuition.monthlyFee,
          tutorEmail: tuition.tutorEmail,
          studentName: student?.name || "Student",
          studentEmail,
          studentPhone: student?.phone || "",
          preferredSchedule: schedule,
          studentNote: note,
          status,
          appliedAt: daysAgo(day),
        },
      },
      { upsert: true }
    );
  }

  console.log("Seeding payments...");
  const payments = db.collection("payments");
  const paymentSeed = [
    {
      userEmail: "tutor@mentorlagbe.com",
      userName: "Ayesha Rahman",
      userRole: "tutor",
      amount: 15,
      transactionId: "seed_pi_tutor_pro_1",
      stripeSessionId: "seed_cs_tutor_pro_1",
      day: 18,
    },
    {
      userEmail: "farhan@mentorlagbe.com",
      userName: "Farhan Ahmed",
      userRole: "tutor",
      amount: 15,
      transactionId: "seed_pi_tutor_pro_2",
      stripeSessionId: "seed_cs_tutor_pro_2",
      day: 12,
    },
    {
      userEmail: "mim@mentorlagbe.com",
      userName: "Mim Akter",
      userRole: "student",
      amount: 10,
      transactionId: "seed_pi_student_pro_1",
      stripeSessionId: "seed_cs_student_pro_1",
      day: 6,
    },
  ];

  for (const payment of paymentSeed) {
    await payments.updateOne(
      { stripeSessionId: payment.stripeSessionId },
      {
        $setOnInsert: {
          userEmail: payment.userEmail,
          userName: payment.userName,
          userRole: payment.userRole,
          planName: "pro",
          amount: payment.amount,
          currency: "usd",
          transactionId: payment.transactionId,
          stripeSessionId: payment.stripeSessionId,
          paymentStatus: "paid",
          paidAt: daysAgo(payment.day),
        },
      },
      { upsert: true }
    );
  }

  const [userCount, tuitionCount, appCount, paymentCount] = await Promise.all([
    db.collection("users").countDocuments({}),
    db.collection("tuitions").countDocuments({}),
    db.collection("applications").countDocuments({}),
    db.collection("payments").countDocuments({}),
  ]);

  console.log("\nSeed complete");
  console.log(`  users: ${userCount}`);
  console.log(`  tuitions: ${tuitionCount}`);
  console.log(`  applications: ${appCount}`);
  console.log(`  payments: ${paymentCount}`);
  console.log(`\nAdmin login: ${ADMIN_EMAIL}`);
  console.log(`Demo tutor: tutor@mentorlagbe.com / ${DEMO_PASSWORD}`);
  console.log(`Demo student: student@mentorlagbe.com / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDB();
  });
