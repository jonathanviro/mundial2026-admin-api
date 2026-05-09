import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const MATCHES = [
  // GRUPO A: México, Sudáfrica, Corea del Sur, República Checa
  {
    match_number: 1,
    group_name: "A",
    team_local: "México",
    team_visitor: "Sudáfrica",
  },
  {
    match_number: 2,
    group_name: "A",
    team_local: "Corea del Sur",
    team_visitor: "Rep. Checa",
  },
  {
    match_number: 3,
    group_name: "A",
    team_local: "México",
    team_visitor: "Corea del Sur",
  },
  {
    match_number: 4,
    group_name: "A",
    team_local: "Sudáfrica",
    team_visitor: "Rep. Checa",
  },
  {
    match_number: 5,
    group_name: "A",
    team_local: "México",
    team_visitor: "Rep. Checa",
  },
  {
    match_number: 6,
    group_name: "A",
    team_local: "Sudáfrica",
    team_visitor: "Corea del Sur",
  },

  // GRUPO B: Canadá, Bosnia y Herzegovina, Qatar, Suiza
  {
    match_number: 7,
    group_name: "B",
    team_local: "Canadá",
    team_visitor: "Qatar",
  },
  {
    match_number: 8,
    group_name: "B",
    team_local: "Bosnia y Herz.",
    team_visitor: "Suiza",
  },
  {
    match_number: 9,
    group_name: "B",
    team_local: "Canadá",
    team_visitor: "Bosnia y Herz.",
  },
  {
    match_number: 10,
    group_name: "B",
    team_local: "Qatar",
    team_visitor: "Suiza",
  },
  {
    match_number: 11,
    group_name: "B",
    team_local: "Canadá",
    team_visitor: "Suiza",
  },
  {
    match_number: 12,
    group_name: "B",
    team_local: "Bosnia y Herz.",
    team_visitor: "Qatar",
  },

  // GRUPO C: Brasil, Marruecos, Haití, Escocia
  {
    match_number: 13,
    group_name: "C",
    team_local: "Brasil",
    team_visitor: "Marruecos",
  },
  {
    match_number: 14,
    group_name: "C",
    team_local: "Haití",
    team_visitor: "Escocia",
  },
  {
    match_number: 15,
    group_name: "C",
    team_local: "Brasil",
    team_visitor: "Haití",
  },
  {
    match_number: 16,
    group_name: "C",
    team_local: "Marruecos",
    team_visitor: "Escocia",
  },
  {
    match_number: 17,
    group_name: "C",
    team_local: "Brasil",
    team_visitor: "Escocia",
  },
  {
    match_number: 18,
    group_name: "C",
    team_local: "Marruecos",
    team_visitor: "Haití",
  },

  // GRUPO D: Estados Unidos, Paraguay, Australia, Turquía
  {
    match_number: 19,
    group_name: "D",
    team_local: "EE.UU.",
    team_visitor: "Paraguay",
  },
  {
    match_number: 20,
    group_name: "D",
    team_local: "Australia",
    team_visitor: "Turquía",
  },
  {
    match_number: 21,
    group_name: "D",
    team_local: "EE.UU.",
    team_visitor: "Australia",
  },
  {
    match_number: 22,
    group_name: "D",
    team_local: "Paraguay",
    team_visitor: "Turquía",
  },
  {
    match_number: 23,
    group_name: "D",
    team_local: "EE.UU.",
    team_visitor: "Turquía",
  },
  {
    match_number: 24,
    group_name: "D",
    team_local: "Paraguay",
    team_visitor: "Australia",
  },

  // GRUPO E: Alemania, Curazao, Costa de Marfil, Ecuador
  {
    match_number: 25,
    group_name: "E",
    team_local: "Alemania",
    team_visitor: "Curazao",
  },
  {
    match_number: 26,
    group_name: "E",
    team_local: "Costa de Marfil",
    team_visitor: "Ecuador",
  },
  {
    match_number: 27,
    group_name: "E",
    team_local: "Alemania",
    team_visitor: "Costa de Marfil",
  },
  {
    match_number: 28,
    group_name: "E",
    team_local: "Curazao",
    team_visitor: "Ecuador",
  },
  {
    match_number: 29,
    group_name: "E",
    team_local: "Alemania",
    team_visitor: "Ecuador",
  },
  {
    match_number: 30,
    group_name: "E",
    team_local: "Costa de Marfil",
    team_visitor: "Curazao",
  },

  // GRUPO F: Países Bajos, Japón, Suecia, Túnez
  {
    match_number: 31,
    group_name: "F",
    team_local: "Países Bajos",
    team_visitor: "Japón",
  },
  {
    match_number: 32,
    group_name: "F",
    team_local: "Suecia",
    team_visitor: "Túnez",
  },
  {
    match_number: 33,
    group_name: "F",
    team_local: "Países Bajos",
    team_visitor: "Suecia",
  },
  {
    match_number: 34,
    group_name: "F",
    team_local: "Japón",
    team_visitor: "Túnez",
  },
  {
    match_number: 35,
    group_name: "F",
    team_local: "Países Bajos",
    team_visitor: "Túnez",
  },
  {
    match_number: 36,
    group_name: "F",
    team_local: "Japón",
    team_visitor: "Suecia",
  },

  // GRUPO G: Bélgica, Egipto, Irán, Nueva Zelanda
  {
    match_number: 37,
    group_name: "G",
    team_local: "Bélgica",
    team_visitor: "Egipto",
  },
  {
    match_number: 38,
    group_name: "G",
    team_local: "Irán",
    team_visitor: "Nueva Zelanda",
  },
  {
    match_number: 39,
    group_name: "G",
    team_local: "Bélgica",
    team_visitor: "Irán",
  },
  {
    match_number: 40,
    group_name: "G",
    team_local: "Egipto",
    team_visitor: "Nueva Zelanda",
  },
  {
    match_number: 41,
    group_name: "G",
    team_local: "Bélgica",
    team_visitor: "Nueva Zelanda",
  },
  {
    match_number: 42,
    group_name: "G",
    team_local: "Egipto",
    team_visitor: "Irán",
  },

  // GRUPO H: España, Cabo Verde, Arabia Saudita, Uruguay
  {
    match_number: 43,
    group_name: "H",
    team_local: "España",
    team_visitor: "Cabo Verde",
  },
  {
    match_number: 44,
    group_name: "H",
    team_local: "Arabia Saudita",
    team_visitor: "Uruguay",
  },
  {
    match_number: 45,
    group_name: "H",
    team_local: "España",
    team_visitor: "Arabia Saudita",
  },
  {
    match_number: 46,
    group_name: "H",
    team_local: "Cabo Verde",
    team_visitor: "Uruguay",
  },
  {
    match_number: 47,
    group_name: "H",
    team_local: "España",
    team_visitor: "Uruguay",
  },
  {
    match_number: 48,
    group_name: "H",
    team_local: "Cabo Verde",
    team_visitor: "Arabia Saudita",
  },

  // GRUPO I: Francia, Senegal, Irak, Noruega
  {
    match_number: 49,
    group_name: "I",
    team_local: "Francia",
    team_visitor: "Senegal",
  },
  {
    match_number: 50,
    group_name: "I",
    team_local: "Irak",
    team_visitor: "Noruega",
  },
  {
    match_number: 51,
    group_name: "I",
    team_local: "Francia",
    team_visitor: "Irak",
  },
  {
    match_number: 52,
    group_name: "I",
    team_local: "Senegal",
    team_visitor: "Noruega",
  },
  {
    match_number: 53,
    group_name: "I",
    team_local: "Francia",
    team_visitor: "Noruega",
  },
  {
    match_number: 54,
    group_name: "I",
    team_local: "Senegal",
    team_visitor: "Irak",
  },

  // GRUPO J: Argentina, Argelia, Austria, Jordania
  {
    match_number: 55,
    group_name: "J",
    team_local: "Argentina",
    team_visitor: "Argelia",
  },
  {
    match_number: 56,
    group_name: "J",
    team_local: "Austria",
    team_visitor: "Jordania",
  },
  {
    match_number: 57,
    group_name: "J",
    team_local: "Argentina",
    team_visitor: "Austria",
  },
  {
    match_number: 58,
    group_name: "J",
    team_local: "Argelia",
    team_visitor: "Jordania",
  },
  {
    match_number: 59,
    group_name: "J",
    team_local: "Argentina",
    team_visitor: "Jordania",
  },
  {
    match_number: 60,
    group_name: "J",
    team_local: "Argelia",
    team_visitor: "Austria",
  },

  // GRUPO K: Portugal, R.D. del Congo, Uzbekistán, Colombia
  {
    match_number: 61,
    group_name: "K",
    team_local: "Portugal",
    team_visitor: "Uzbekistán",
  },
  {
    match_number: 62,
    group_name: "K",
    team_local: "R.D. del Congo",
    team_visitor: "Colombia",
  },
  {
    match_number: 63,
    group_name: "K",
    team_local: "Portugal",
    team_visitor: "R.D. del Congo",
  },
  {
    match_number: 64,
    group_name: "K",
    team_local: "Uzbekistán",
    team_visitor: "Colombia",
  },
  {
    match_number: 65,
    group_name: "K",
    team_local: "Portugal",
    team_visitor: "Colombia",
  },
  {
    match_number: 66,
    group_name: "K",
    team_local: "Uzbekistán",
    team_visitor: "R.D. del Congo",
  },

  // GRUPO L: Inglaterra, Croacia, Ghana, Panamá
  {
    match_number: 67,
    group_name: "L",
    team_local: "Inglaterra",
    team_visitor: "Croacia",
  },
  {
    match_number: 68,
    group_name: "L",
    team_local: "Ghana",
    team_visitor: "Panamá",
  },
  {
    match_number: 69,
    group_name: "L",
    team_local: "Inglaterra",
    team_visitor: "Ghana",
  },
  {
    match_number: 70,
    group_name: "L",
    team_local: "Croacia",
    team_visitor: "Panamá",
  },
  {
    match_number: 71,
    group_name: "L",
    team_local: "Inglaterra",
    team_visitor: "Panamá",
  },
  {
    match_number: 72,
    group_name: "L",
    team_local: "Croacia",
    team_visitor: "Ghana",
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  const existing = await prisma.user.findFirst({
    where: { role: UserRole.SUPERADMIN },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: process.env.SUPERADMIN_EMAIL || "admin@nullexsoft.com",
        password_hash: await bcrypt.hash(
          process.env.SUPERADMIN_PASSWORD || "AdminMundial2026!",
          10,
        ),
        nombres: "Super Admin",
        role: UserRole.SUPERADMIN,
      },
    });
    console.log(
      "✓ Superadmin creado: admin@nullexsoft.com / AdminMundial2026!",
    );
  } else {
    console.log("✓ Superadmin ya existe");
  }

  console.log("\n✅ Seed completado.");
  console.log(
    `\n📋 ${MATCHES.length} partidos listos para cargar desde el panel admin`,
  );
  console.log(
    "   Una vez que crees tu campaña y fase, usa POST /api/matches/bulk",
  );
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
