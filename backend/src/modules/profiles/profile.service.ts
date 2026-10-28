import { prisma } from "../../config/database";
import { Prisma } from "../../generated/prisma/client";
import type {
UpdateOwnerProfileInput,
UpdateStudentProfileInput,
UniversityQuery,
} from "./profile.validation";

export class ProfileError extends Error {
constructor(
message: string,
public statusCode: number,
) {
super(message);
this.name = "ProfileError";
}
}

export async function getStudentProfile(userId: string) {
const user = await prisma.user.findUnique({
where: { id: userId },
select: {
id: true,
fullName: true,
email: true,
phone: true,
role: true,
status: true,
createdAt: true,
studentProfile: {
include: {
university: {
select: {
id: true,
name: true,
slug: true,
city: true,
},
},
},
},
},
});

if (!user) {
throw new ProfileError("User not found", 404);
}

if (user.role !== "STUDENT") {
throw new ProfileError("Student account required", 403);
}

return user;
}

export async function updateStudentProfile(
userId: string,
input: UpdateStudentProfileInput,
) {
const user = await prisma.user.findUnique({
where: { id: userId },
select: {
id: true,
role: true,
studentProfile: { select: { id: true } },
},
});

if (!user) {
throw new ProfileError("User not found", 404);
}

if (user.role !== "STUDENT") {
throw new ProfileError("Student account required", 403);
}

if (input.universityId) {
const university = await prisma.university.findUnique({
where: { id: input.universityId },
select: { id: true },
});


if (!university) {
  throw new ProfileError("University not found", 404);
}


}

const { fullName, phone, ...profileFields } = input;

const userUpdate = await prisma.user.update({
where: { id: userId },
data: {
...(fullName !== undefined ? { fullName } : {}),
...(phone !== undefined ? { phone } : {}),
},
select: {
id: true,
fullName: true,
email: true,
phone: true,
role: true,
status: true,
updatedAt: true,
},
});

const studentProfile = user.studentProfile
? await prisma.studentProfile.update({
where: { userId },
data: {
...(profileFields.universityId !== undefined
? { universityId: profileFields.universityId }
: {}),
...(profileFields.budgetMin !== undefined
? {
budgetMin:
profileFields.budgetMin === null
? null
: new Prisma.Decimal(profileFields.budgetMin),
}
: {}),
...(profileFields.budgetMax !== undefined
? {
budgetMax:
profileFields.budgetMax === null
? null
: new Prisma.Decimal(profileFields.budgetMax),
}
: {}),
...(profileFields.preferredCity !== undefined
? { preferredCity: profileFields.preferredCity }
: {}),
},
})
: await prisma.studentProfile.create({
data: {
userId,
...(profileFields.universityId !== undefined
? { universityId: profileFields.universityId }
: {}),
...(profileFields.budgetMin !== undefined
? {
budgetMin:
profileFields.budgetMin === null
? null
: new Prisma.Decimal(profileFields.budgetMin),
}
: {}),
...(profileFields.budgetMax !== undefined
? {
budgetMax:
profileFields.budgetMax === null
? null
: new Prisma.Decimal(profileFields.budgetMax),
}
: {}),
...(profileFields.preferredCity !== undefined
? { preferredCity: profileFields.preferredCity }
: {}),
},
});

return {
...userUpdate,
studentProfile,
};
}

export async function getOwnerProfile(userId: string) {
const user = await prisma.user.findUnique({
where: { id: userId },
select: {
id: true,
fullName: true,
email: true,
phone: true,
role: true,
status: true,
createdAt: true,
ownerProfile: true,
},
});

if (!user) {
throw new ProfileError("User not found", 404);
}

if (user.role !== "OWNER") {
throw new ProfileError("Owner account required", 403);
}

return user;
}

export async function updateOwnerProfile(
userId: string,
input: UpdateOwnerProfileInput,
) {
const user = await prisma.user.findUnique({
where: { id: userId },
select: {
id: true,
role: true,
},
});

if (!user) {
throw new ProfileError("User not found", 404);
}

if (user.role !== "OWNER") {
throw new ProfileError("Owner account required", 403);
}

return prisma.user.update({
where: { id: userId },
data: {
...(input.fullName !== undefined
? { fullName: input.fullName }
: {}),
...(input.phone !== undefined ? { phone: input.phone } : {}),
},
select: {
id: true,
fullName: true,
email: true,
phone: true,
role: true,
status: true,
updatedAt: true,
ownerProfile: true,
},
});
}

export async function listUniversities(filters: UniversityQuery) {
const { search, city, page, limit } = filters;

const where: Prisma.UniversityWhereInput = {
...(search
? { name: { contains: search, mode: "insensitive" } }
: {}),
...(city
? { city: { contains: city, mode: "insensitive" } }
: {}),
};

const [universities, total] = await prisma.$transaction([
prisma.university.findMany({
where,
skip: (page - 1) * limit,
take: limit,
orderBy: { name: "asc" },
select: {
id: true,
name: true,
slug: true,
city: true,
latitude: true,
longitude: true,
},
}),
prisma.university.count({ where }),
]);

return {
universities,
pagination: {
page,
limit,
total,
totalPages: Math.ceil(total / limit),
},
};
}
