import prisma from '../prisma/client'

/**
 * Hard-delete a child account and related user-scoped data (GDPR right to erasure).
 * Order matters: clear artifacts and tokens, strip optional legacy links, then Student CASCADE.
 */
export async function deleteStudentAndRelatedData(studentId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.aiSparkArtifact.deleteMany({ where: { requesterId: studentId } });
    await tx.refreshToken.deleteMany({ where: { userId: studentId } });
    const linkedProfiles = await tx.studentProfile.findMany({
      where: { legacyStudentId: studentId },
      select: { userId: true },
    });
    for (const p of linkedProfiles) {
      await tx.refreshToken.deleteMany({ where: { userId: p.userId } });
    }
    await tx.message.deleteMany({ where: { fromId: studentId } });

    await tx.studentProfile.updateMany({
      where: { legacyStudentId: studentId },
      data: { legacyStudentId: null },
    });
    await tx.parentProfile.updateMany({
      where: { legacyStudentId: studentId },
      data: { legacyStudentId: null },
    });

    const postsWithTag = await tx.activityPost.findMany({
      where: { studentTags: { has: studentId } },
      select: { id: true, studentTags: true },
    });
    for (const p of postsWithTag) {
      const next = p.studentTags.filter((id) => id !== studentId);
      await tx.activityPost.update({
        where: { id: p.id },
        data: { studentTags: { set: next } },
      });
    }

    await tx.student.delete({ where: { id: studentId } });
  });
}
