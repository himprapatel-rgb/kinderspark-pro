import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import { aiComplete } from '../services/ai/router'
import { uploadActivityPostImage, deleteCloudinaryImage } from '../services/storage.service'

const router = Router()
router.use(requireAuth)

// POST /api/activity - Teacher creates an activity post (with optional AI caption)
router.post('/', requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  try {
    const { classId, imageData, caption, studentTags, emoji, generateCaption } = req.body

    if (!classId || !imageData) {
      return res.status(400).json({ error: 'classId and imageData are required' })
    }

    // Validate image data isn't too large (max ~5MB base64)
    if (imageData.length > 7_000_000) {
      return res.status(400).json({ error: 'Image too large. Max 5MB.' })
    }

    let imageUrl = ''
    let thumbUrl: string | null = null
    let cloudinaryPublicId: string | null = null
    try {
      const uploaded = await uploadActivityPostImage(classId, imageData)
      imageUrl = uploaded.url
      thumbUrl = uploaded.thumbUrl
      cloudinaryPublicId = uploaded.publicId
    } catch (e: any) {
      const msg = e?.message || String(e)
      if (msg.includes('Cloudinary is not configured')) {
        return res.status(503).json({ error: 'Image upload is temporarily unavailable.' })
      }
      console.error('Activity Cloudinary upload error:', e)
      return res.status(500).json({ error: 'Failed to upload image' })
    }

    let finalCaption = caption || ''
    let isAiCaption = false

    // Optionally generate AI caption
    if (generateCaption && !caption) {
      try {
        // Get class info for context
        const classInfo = await prisma.class.findUnique({
          where: { id: classId },
          include: { students: { select: { name: true, id: true } } },
        })

        const taggedNames = (studentTags || [])
          .map((id: string) => classInfo?.students.find((s) => s.id === id)?.name)
          .filter(Boolean)

        const prompt = `You are writing a brief, warm activity caption for a kindergarten parent audience.
The teacher just shared a photo of classroom activity.
Class: ${classInfo?.name || 'Class'}
Grade: ${classInfo?.grade || 'KG'}
${taggedNames.length ? `Students in photo: ${taggedNames.join(', ')}` : ''}
${emoji ? `Activity type: ${emoji}` : ''}

Write a 1-2 sentence caption that:
- Is warm and encouraging
- Mentions the students by name if provided
- Describes what the children might be learning
- Ends with a relevant emoji

Return ONLY the caption text, nothing else.`

        const aiResult = await aiComplete('caption', prompt, { maxTokens: 100 })
        finalCaption = aiResult.text.trim()
        isAiCaption = true
      } catch {
        finalCaption = 'A wonderful moment from class today! 📸'
        isAiCaption = false
      }
    }

    const post = await prisma.activityPost.create({
      data: {
        classId,
        teacherId: req.user!.id,
        imageUrl,
        thumbUrl,
        cloudinaryPublicId,
        caption: finalCaption,
        aiCaption: isAiCaption,
        studentTags: studentTags || [],
        emoji: emoji || '📸',
      },
    })

    // Return compact image URLs for fast feed rendering.
    res.status(201).json({
      id: post.id,
      classId: post.classId,
      imageUrl: post.imageUrl,
      thumbUrl: post.thumbUrl,
      caption: post.caption,
      aiCaption: post.aiCaption,
      emoji: post.emoji,
      studentTags: post.studentTags,
      likes: post.likes,
      createdAt: post.createdAt,
    })
  } catch (error) {
    console.error('Create activity post error:', error)
    res.status(500).json({ error: 'Failed to create activity post' })
  }
})

// GET /api/activity/:classId - Get activity feed for a class
router.get('/:classId', async (req: Request, res: Response) => {
  try {
    const { classId } = req.params
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
    const cursor = req.query.cursor as string | undefined

    const posts = await prisma.activityPost.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    res.json(posts)
  } catch (error) {
    console.error('Get activity feed error:', error)
    res.status(500).json({ error: 'Failed to get activity feed' })
  }
})

// POST /api/activity/:id/like - Like/unlike a post
router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const post = await prisma.activityPost.update({
      where: { id },
      data: { likes: { increment: 1 } },
    })
    res.json({ likes: post.likes })
  } catch (error) {
    console.error('Like post error:', error)
    res.status(500).json({ error: 'Failed to like post' })
  }
})

// DELETE /api/activity/:id - Delete a post (teacher only)
router.delete('/:id', requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const post = await prisma.activityPost.findUnique({ where: { id } })
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (post.teacherId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Not your post' })
    }
    if (post.cloudinaryPublicId) {
      await deleteCloudinaryImage(post.cloudinaryPublicId).catch(() => {})
    }
    await prisma.activityPost.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete post error:', error)
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

export default router
