import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { TEMPLATES, getTemplate } from '../templates/definitions';
import { logger } from '../lib/logger';

const router = Router();

/** GET /api/templates — list all available templates (id, name, description, icon). */
router.get('/templates', requireAuth, (_req, res) => {
  const list = TEMPLATES.map(({ id, name, description, icon }) => ({
    id,
    name,
    description,
    icon,
  }));
  res.json(list);
});

/** GET /api/templates/:id — full schema for one template (fields[]). */
router.get('/templates/:id', requireAuth, (req, res) => {
  const template = getTemplate(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const { id, name, description, icon, fields } = template;
  res.json({ id, name, description, icon, fields });
});

/**
 * POST /api/templates/:id/create
 * Body: { title: string, author?: string, values: Record<string, string | string[]> }
 * Assembles a structured document from the template fields and persists it.
 */
router.post('/templates/:id/create', requireAuth, async (req, res) => {
  const { userId, orgId } = req.auth!;

  const template = getTemplate(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const title = (req.body?.title ?? '').trim();
  const author = (req.body?.author ?? '').trim();
  const values: Record<string, string | string[]> = req.body?.values ?? {};

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Validate required fields
  for (const field of template.fields) {
    if (!field.required) continue;
    const val = values[field.id];
    const isEmpty = Array.isArray(val)
      ? val.filter((s) => s.trim()).length === 0
      : !val || !val.trim();
    if (isEmpty) {
      return res.status(400).json({ error: `"${field.label}" is required` });
    }
  }

  let built: ReturnType<typeof template.build>;
  try {
    built = template.build(values);
  } catch (err) {
    logger.error('Template build failed', { route: 'POST /api/templates/:id/create', errorType: 'TemplateBuildError' });
    return res.status(500).json({ error: 'Failed to assemble document from template' });
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert({
      org_id: orgId,
      created_by: userId,
      title,
      author_name: author || null,
      format: template.format,
      summary: built.summary,
      content: built.content,
      diagram_data: null,
      warnings: [],
      tags: built.tags,
      raw_input: null,
      source_file_path: null,
      source: 'template',
    })
    .select('*')
    .single();

  if (error) {
    logger.error('Template document insert failed', { route: 'POST /api/templates/:id/create', errorType: 'SupabaseInsertError' });
    return res.status(500).json({ error: 'Failed to save document' });
  }

  res.status(201).json(data);
});

export default router;
