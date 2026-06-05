import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const MATCHES = [
  { match_number: 1, group_name: "A", team_local: "México", team_visitor: "Sudáfrica", date: "2026-06-11" },
  { match_number: 2, group_name: "A", team_local: "Corea del Sur", team_visitor: "Rep. Checa", date: "2026-06-11" },
  { match_number: 3, group_name: "A", team_local: "México", team_visitor: "Corea del Sur", date: "2026-06-18" },
  { match_number: 4, group_name: "A", team_local: "Sudáfrica", team_visitor: "Rep. Checa", date: "2026-06-18" },
  { match_number: 5, group_name: "A", team_local: "México", team_visitor: "Rep. Checa", date: "2026-06-24" },
  { match_number: 6, group_name: "A", team_local: "Sudáfrica", team_visitor: "Corea del Sur", date: "2026-06-24" },
  { match_number: 7, group_name: "B", team_local: "Canadá", team_visitor: "Qatar", date: "2026-06-18" },
  { match_number: 8, group_name: "B", team_local: "Bosnia y Herz.", team_visitor: "Suiza", date: "2026-06-18" },
  { match_number: 9, group_name: "B", team_local: "Canadá", team_visitor: "Bosnia y Herz.", date: "2026-06-12" },
  { match_number: 10, group_name: "B", team_local: "Qatar", team_visitor: "Suiza", date: "2026-06-13" },
  { match_number: 11, group_name: "B", team_local: "Canadá", team_visitor: "Suiza", date: "2026-06-24" },
  { match_number: 12, group_name: "B", team_local: "Bosnia y Herz.", team_visitor: "Qatar", date: "2026-06-24" },
  { match_number: 13, group_name: "C", team_local: "Brasil", team_visitor: "Marruecos", date: "2026-06-13" },
  { match_number: 14, group_name: "C", team_local: "Haití", team_visitor: "Escocia", date: "2026-06-13" },
  { match_number: 15, group_name: "C", team_local: "Brasil", team_visitor: "Haití", date: "2026-06-19" },
  { match_number: 16, group_name: "C", team_local: "Marruecos", team_visitor: "Escocia", date: "2026-06-19" },
  { match_number: 17, group_name: "C", team_local: "Brasil", team_visitor: "Escocia", date: "2026-06-24" },
  { match_number: 18, group_name: "C", team_local: "Marruecos", team_visitor: "Haití", date: "2026-06-24" },
  { match_number: 19, group_name: "D", team_local: "EE.UU.", team_visitor: "Paraguay", date: "2026-06-12" },
  { match_number: 20, group_name: "D", team_local: "Australia", team_visitor: "Turquía", date: "2026-06-13" },
  { match_number: 21, group_name: "D", team_local: "EE.UU.", team_visitor: "Australia", date: "2026-06-19" },
  { match_number: 22, group_name: "D", team_local: "Paraguay", team_visitor: "Turquía", date: "2026-06-19" },
  { match_number: 23, group_name: "D", team_local: "EE.UU.", team_visitor: "Turquía", date: "2026-06-25" },
  { match_number: 24, group_name: "D", team_local: "Paraguay", team_visitor: "Australia", date: "2026-06-25" },
  { match_number: 25, group_name: "E", team_local: "Alemania", team_visitor: "Curazao", date: "2026-06-14" },
  { match_number: 26, group_name: "E", team_local: "Costa de Marfil", team_visitor: "Ecuador", date: "2026-06-14" },
  { match_number: 27, group_name: "E", team_local: "Alemania", team_visitor: "Costa de Marfil", date: "2026-06-20" },
  { match_number: 28, group_name: "E", team_local: "Curazao", team_visitor: "Ecuador", date: "2026-06-20" },
  { match_number: 29, group_name: "E", team_local: "Alemania", team_visitor: "Ecuador", date: "2026-06-25" },
  { match_number: 30, group_name: "E", team_local: "Costa de Marfil", team_visitor: "Curazao", date: "2026-06-25" },
  { match_number: 31, group_name: "F", team_local: "Países Bajos", team_visitor: "Japón", date: "2026-06-14" },
  { match_number: 32, group_name: "F", team_local: "Suecia", team_visitor: "Túnez", date: "2026-06-14" },
  { match_number: 33, group_name: "F", team_local: "Países Bajos", team_visitor: "Suecia", date: "2026-06-20" },
  { match_number: 34, group_name: "F", team_local: "Japón", team_visitor: "Túnez", date: "2026-06-20" },
  { match_number: 35, group_name: "F", team_local: "Países Bajos", team_visitor: "Túnez", date: "2026-06-25" },
  { match_number: 36, group_name: "F", team_local: "Japón", team_visitor: "Suecia", date: "2026-06-25" },
  { match_number: 37, group_name: "G", team_local: "Bélgica", team_visitor: "Egipto", date: "2026-06-15" },
  { match_number: 38, group_name: "G", team_local: "Irán", team_visitor: "Nueva Zelanda", date: "2026-06-15" },
  { match_number: 39, group_name: "G", team_local: "Bélgica", team_visitor: "Irán", date: "2026-06-21" },
  { match_number: 40, group_name: "G", team_local: "Egipto", team_visitor: "Nueva Zelanda", date: "2026-06-21" },
  { match_number: 41, group_name: "G", team_local: "Bélgica", team_visitor: "Nueva Zelanda", date: "2026-06-26" },
  { match_number: 42, group_name: "G", team_local: "Egipto", team_visitor: "Irán", date: "2026-06-26" },
  { match_number: 43, group_name: "H", team_local: "España", team_visitor: "Cabo Verde", date: "2026-06-15" },
  { match_number: 44, group_name: "H", team_local: "Arabia Saudita", team_visitor: "Uruguay", date: "2026-06-15" },
  { match_number: 45, group_name: "H", team_local: "España", team_visitor: "Arabia Saudita", date: "2026-06-21" },
  { match_number: 46, group_name: "H", team_local: "Cabo Verde", team_visitor: "Uruguay", date: "2026-06-21" },
  { match_number: 47, group_name: "H", team_local: "España", team_visitor: "Uruguay", date: "2026-06-26" },
  { match_number: 48, group_name: "H", team_local: "Cabo Verde", team_visitor: "Arabia Saudita", date: "2026-06-26" },
  { match_number: 49, group_name: "I", team_local: "Francia", team_visitor: "Senegal", date: "2026-06-16" },
  { match_number: 50, group_name: "I", team_local: "Irak", team_visitor: "Noruega", date: "2026-06-16" },
  { match_number: 51, group_name: "I", team_local: "Francia", team_visitor: "Irak", date: "2026-06-22" },
  { match_number: 52, group_name: "I", team_local: "Senegal", team_visitor: "Noruega", date: "2026-06-22" },
  { match_number: 53, group_name: "I", team_local: "Francia", team_visitor: "Noruega", date: "2026-06-26" },
  { match_number: 54, group_name: "I", team_local: "Senegal", team_visitor: "Irak", date: "2026-06-26" },
  { match_number: 55, group_name: "J", team_local: "Argentina", team_visitor: "Argelia", date: "2026-06-16" },
  { match_number: 56, group_name: "J", team_local: "Austria", team_visitor: "Jordania", date: "2026-06-16" },
  { match_number: 57, group_name: "J", team_local: "Argentina", team_visitor: "Austria", date: "2026-06-22" },
  { match_number: 58, group_name: "J", team_local: "Argelia", team_visitor: "Jordania", date: "2026-06-22" },
  { match_number: 59, group_name: "J", team_local: "Argentina", team_visitor: "Jordania", date: "2026-06-27" },
  { match_number: 60, group_name: "J", team_local: "Argelia", team_visitor: "Austria", date: "2026-06-27" },
  { match_number: 61, group_name: "K", team_local: "Portugal", team_visitor: "Uzbekistán", date: "2026-06-23" },
  { match_number: 62, group_name: "K", team_local: "R.D. del Congo", team_visitor: "Colombia", date: "2026-06-17" },
  { match_number: 63, group_name: "K", team_local: "Portugal", team_visitor: "R.D. del Congo", date: "2026-06-17" },
  { match_number: 64, group_name: "K", team_local: "Uzbekistán", team_visitor: "Colombia", date: "2026-06-17" },
  { match_number: 65, group_name: "K", team_local: "Portugal", team_visitor: "Colombia", date: "2026-06-27" },
  { match_number: 66, group_name: "K", team_local: "Uzbekistán", team_visitor: "R.D. del Congo", date: "2026-06-27" },
  { match_number: 67, group_name: "L", team_local: "Inglaterra", team_visitor: "Croacia", date: "2026-06-17" },
  { match_number: 68, group_name: "L", team_local: "Ghana", team_visitor: "Panamá", date: "2026-06-17" },
  { match_number: 69, group_name: "L", team_local: "Inglaterra", team_visitor: "Ghana", date: "2026-06-23" },
  { match_number: 70, group_name: "L", team_local: "Croacia", team_visitor: "Panamá", date: "2026-06-23" },
  { match_number: 71, group_name: "L", team_local: "Inglaterra", team_visitor: "Panamá", date: "2026-06-27" },
  { match_number: 72, group_name: "L", team_local: "Croacia", team_visitor: "Ghana", date: "2026-06-27" },
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
    console.log("✓ Superadmin creado: admin@nullexsoft.com / AdminMundial2026!");
  } else {
    console.log("✓ Superadmin ya existe");
  }

  // Insertar partidos si existe la fase de grupos
  const phase = await prisma.phase.findFirst({ where: { number: 1 } });
  if (phase) {
    const existing = await prisma.match.count({ where: { phase_id: phase.id } });
    if (existing === 0) {
      await prisma.match.createMany({
        data: MATCHES.map((m) => ({ ...m, phase_id: phase.id })),
        skipDuplicates: true,
      });
      console.log(`✓ ${MATCHES.length} partidos insertados en fase #${phase.id} con fechas`);
    } else {
      console.log(`✓ ${existing} partidos ya existen en la fase #${phase.id}`);
    }
  } else {
    console.log("\n⚠️  No hay fase de grupos creada. Crea una desde el panel y vuelve a ejecutar el seed.");
    console.log(`   O usa la carga masiva desde Partidos → Auto-cargar 72 partidos`);
  }

  console.log("\n✅ Seed completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
