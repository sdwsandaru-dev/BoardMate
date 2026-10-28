/**
 * Add Sri Lanka's state universities (under the University Grants Commission,
 * plus KDU). Safe to re-run: rows are matched by slug and updated, never duplicated.
 *
 * Usage: npm run db:seed-universities
 */
import "dotenv/config";

import { prisma } from "../config/database";

// Coordinates are approximate main-campus locations.
const UNIVERSITIES = [
  { name: "University of Colombo", slug: "university-of-colombo", city: "Colombo", latitude: 6.9006, longitude: 79.8592 },
  { name: "University of Peradeniya", slug: "university-of-peradeniya", city: "Kandy", latitude: 7.2549, longitude: 80.5974 },
  { name: "University of Sri Jayewardenepura", slug: "university-of-sri-jayewardenepura", city: "Nugegoda", latitude: 6.8528, longitude: 79.9036 },
  { name: "University of Kelaniya", slug: "university-of-kelaniya", city: "Kelaniya", latitude: 6.9733, longitude: 79.9157 },
  { name: "University of Moratuwa", slug: "university-of-moratuwa", city: "Moratuwa", latitude: 6.7951, longitude: 79.9009 },
  { name: "University of Jaffna", slug: "university-of-jaffna", city: "Jaffna", latitude: 9.6847, longitude: 80.022 },
  { name: "University of Ruhuna", slug: "university-of-ruhuna", city: "Matara", latitude: 5.9381, longitude: 80.5761 },
  { name: "Eastern University, Sri Lanka", slug: "eastern-university-sri-lanka", city: "Batticaloa", latitude: 7.7944, longitude: 81.579 },
  { name: "South Eastern University of Sri Lanka", slug: "south-eastern-university-of-sri-lanka", city: "Oluvil", latitude: 7.2967, longitude: 81.8497 },
  { name: "Rajarata University of Sri Lanka", slug: "rajarata-university-of-sri-lanka", city: "Mihintale", latitude: 8.361, longitude: 80.5036 },
  { name: "Sabaragamuwa University of Sri Lanka", slug: "sabaragamuwa-university-of-sri-lanka", city: "Belihuloya", latitude: 6.7144, longitude: 80.7871 },
  { name: "Wayamba University of Sri Lanka", slug: "wayamba-university-of-sri-lanka", city: "Kuliyapitiya", latitude: 7.3229, longitude: 80.0297 },
  { name: "Uva Wellassa University", slug: "uva-wellassa-university", city: "Badulla", latitude: 6.9813, longitude: 81.0767 },
  { name: "University of the Visual and Performing Arts", slug: "university-of-the-visual-and-performing-arts", city: "Colombo", latitude: 6.9036, longitude: 79.8617 },
  { name: "The Open University of Sri Lanka", slug: "open-university-of-sri-lanka", city: "Nawala", latitude: 6.8833, longitude: 79.8833 },
  { name: "Gampaha Wickramarachchi University of Indigenous Medicine", slug: "gampaha-wickramarachchi-university", city: "Yakkala", latitude: 7.087, longitude: 80.031 },
  { name: "University of Vavuniya", slug: "university-of-vavuniya", city: "Vavuniya", latitude: 8.755, longitude: 80.498 },
  { name: "General Sir John Kotelawala Defence University", slug: "kotelawala-defence-university", city: "Ratmalana", latitude: 6.819, longitude: 79.888 },
];

async function main() {
  for (const { slug, ...data } of UNIVERSITIES) {
    await prisma.university.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data },
    });
  }

  const total = await prisma.university.count();
  console.log(`Seeded ${UNIVERSITIES.length} universities (${total} in the database).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
