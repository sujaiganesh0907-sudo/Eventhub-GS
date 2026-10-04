import { User, StudentProfile, Follow, Connection } from '../models/index';

/**
 * Reusable Group Add Privacy Validation Service (Requirement 9)
 * Evaluates whether an adder is permitted to add a target student to a group chat or collaborative team.
 * Options: Everyone | Connections only | Same college only | Nobody / request only
 */
export async function checkGroupAddPermission(
  adderUserId: string,
  targetUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (adderUserId === targetUserId) {
    return { allowed: true };
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) return { allowed: false, reason: 'Target user does not exist.' };

  const adderUser = await User.findById(adderUserId);
  if (!adderUser) return { allowed: false, reason: 'Requesting user does not exist.' };

  const targetProfile = await StudentProfile.findOne({ userId: targetUserId });
  if (!targetProfile) {
    // If not a student profile, allow standard addition
    return { allowed: true };
  }

  const privacy = (targetProfile.groupAddPrivacy || 'Everyone') as string;

  if (privacy === 'Nobody / request only' || privacy === 'Nobody') {
    return {
      allowed: false,
      reason: `${targetProfile.fullName} does not allow direct group additions.`,
    };
  }

  if (privacy === 'Connections only') {
    const adderProfile = await StudentProfile.findOne({ userId: adderUserId });
    if (!adderProfile) {
      return { allowed: false, reason: 'Only mutual student connections can add this user to groups.' };
    }

    const [followsThem, theyFollow] = await Promise.all([
      Follow.findOne({ followerStudentId: adderProfile._id, followingStudentId: targetProfile._id }),
      Follow.findOne({ followerStudentId: targetProfile._id, followingStudentId: adderProfile._id }),
    ]);

    if (!followsThem || !theyFollow) {
      return {
        allowed: false,
        reason: `${targetProfile.fullName} only permits mutual connections to add them to groups.`,
      };
    }
  }

  if (privacy === 'Same college only') {
    const adderProfile = await StudentProfile.findOne({ userId: adderUserId });
    const sameCollege =
      (adderProfile?.collegeName && targetProfile.collegeName && adderProfile.collegeName.toLowerCase().trim() === targetProfile.collegeName.toLowerCase().trim()) ||
      (adderUser.collegeId && targetProfile.targetCollegeId === adderUser.collegeId);

    if (!sameCollege) {
      return {
        allowed: false,
        reason: `${targetProfile.fullName} only permits students and faculty from the same institution to add them to groups.`,
      };
    }
  }

  return { allowed: true };
}
