import { Request, Response } from 'express';
import { PlacementPost, InfrastructurePost, College } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

// --- PLACEMENT POSTS ---
export async function getPlacementPosts(req: Request, res: Response) {
  try {
    const { collegeId } = req.query;
    const filter: any = {};
    if (collegeId) filter.collegeId = collegeId;

    const posts = await PlacementPost.find(filter).sort({ createdAt: -1 }).exec();
    return res.json({ success: true, total: posts.length, posts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createPlacementPost(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only authorized college accounts can publish placement updates.' });
    }

    const {
      title,
      company,
      packageLPA,
      placementStatistics,
      message,
      mediaUrl,
      mediaType = 'image',
      date = new Date().toISOString().split('T')[0],
    } = req.body;

    if (!title || !company || !message) {
      return res.status(400).json({ success: false, message: 'Title, company name, and message are required.' });
    }

    const college = await College.findById(user.collegeId);
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });

    const post = await PlacementPost.create({
      collegeId: college._id,
      collegeName: college.name,
      collegeLogo: college.logo,
      title,
      company,
      packageLPA,
      placementStatistics,
      message,
      mediaUrl,
      mediaType,
      date,
      likesCount: 0,
    });

    return res.status(201).json({ success: true, message: 'Placement announcement published.', post });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deletePlacementPost(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;
    const post = await PlacementPost.findById(id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (user?.collegeId !== post.collegeId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await PlacementPost.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Placement post deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updatePlacementPost(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;
    const post = await PlacementPost.findById(id);
    if (!post) return res.status(404).json({ success: false, message: 'Placement post not found' });

    if (user?.collegeId !== post.collegeId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const {
      title,
      company,
      packageLPA,
      placementStatistics,
      message,
      mediaUrl,
      mediaType,
      date,
    } = req.body;

    const updated = await PlacementPost.findByIdAndUpdate(id, {
      $set: {
        ...(title && { title }),
        ...(company && { company }),
        ...(packageLPA !== undefined && { packageLPA }),
        ...(placementStatistics !== undefined && { placementStatistics }),
        ...(message && { message }),
        ...(mediaUrl !== undefined && { mediaUrl }),
        ...(mediaType && { mediaType }),
        ...(date && { date }),
      },
    });

    return res.json({ success: true, message: 'Placement post updated successfully', post: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// --- INFRASTRUCTURE POSTS ---
export async function getInfrastructurePosts(req: Request, res: Response) {
  try {
    const { collegeId, facilityType } = req.query;
    const filter: any = {};
    if (collegeId) filter.collegeId = collegeId;
    if (facilityType && facilityType !== 'All') filter.facilityType = facilityType;

    const posts = await InfrastructurePost.find(filter).sort({ createdAt: -1 }).exec();
    return res.json({ success: true, total: posts.length, posts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createInfrastructurePost(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only authorized college accounts can publish campus infrastructure.' });
    }

    const {
      facilityTitle,
      facilityType = 'Campus',
      description,
      googleMapsLink,
      mediaUrl,
      mediaType = 'image',
    } = req.body;

    if (!facilityTitle || !description) {
      return res.status(400).json({ success: false, message: 'Facility title and description are required.' });
    }

    const college = await College.findById(user.collegeId);
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });

    const post = await InfrastructurePost.create({
      collegeId: college._id,
      collegeName: college.name,
      facilityTitle,
      facilityType,
      description,
      googleMapsLink,
      mediaUrl,
      mediaType,
    });

    return res.status(201).json({ success: true, message: 'Infrastructure facility published.', post });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteInfrastructurePost(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;
    const post = await InfrastructurePost.findById(id);
    if (!post) return res.status(404).json({ success: false, message: 'Facility post not found' });

    if (user?.collegeId !== post.collegeId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await InfrastructurePost.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Facility post deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateInfrastructurePost(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;
    const post = await InfrastructurePost.findById(id);
    if (!post) return res.status(404).json({ success: false, message: 'Facility post not found' });

    if (user?.collegeId !== post.collegeId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const {
      facilityTitle,
      facilityType,
      description,
      googleMapsLink,
      mediaUrl,
      mediaType,
    } = req.body;

    const updated = await InfrastructurePost.findByIdAndUpdate(id, {
      $set: {
        ...(facilityTitle && { facilityTitle }),
        ...(facilityType && { facilityType }),
        ...(description && { description }),
        ...(googleMapsLink !== undefined && { googleMapsLink }),
        ...(mediaUrl !== undefined && { mediaUrl }),
        ...(mediaType && { mediaType }),
      },
    });

    return res.json({ success: true, message: 'Facility post updated successfully', post: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

