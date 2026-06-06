import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const COLS = 'id, template_name, description, fields, is_default, usage_count, is_favorite, created_at';

function toApp(row) {
  return {
    id:         row.id,
    name:       row.template_name,
    description: row.description || '',
    fields:     row.fields || {},
    isDefault:  row.is_default,
    usageCount: row.usage_count,
    isFavorite: row.is_favorite,
    createdAt:  row.created_at,
  };
}

function toRow(t, userId) {
  return {
    user_id:       userId,
    template_name: t.name,
    description:   t.description || '',
    fields:        t.fields || {},
    is_default:    t.isDefault || false,
    strategy:      t.fields?.strategy    || null,
    setup_type:    t.fields?.setup       || null,
    market_condition: t.fields?.marketCondition || null,
  };
}

export function useTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('trade_templates')
      .select(COLS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setTemplates((data || []).map(toApp));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const saveTemplate = useCallback(async (templateData) => {
    if (!user?.id) throw new Error('Not authenticated');
    const row = toRow(templateData, user.id);

    if (templateData.id) {
      const { data, error } = await supabase
        .from('trade_templates')
        .update(row)
        .eq('id', templateData.id)
        .eq('user_id', user.id)
        .select(COLS)
        .single();
      if (error) throw error;
      const updated = toApp(data);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      return updated;
    } else {
      const { data, error } = await supabase
        .from('trade_templates')
        .insert(row)
        .select(COLS)
        .single();
      if (error) throw error;
      const created = toApp(data);
      setTemplates((prev) => [created, ...prev]);
      return created;
    }
  }, [user?.id]);

  const deleteTemplate = useCallback(async (id) => {
    if (!user?.id) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('trade_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, [user?.id]);

  return { templates, loading, fetchTemplates, saveTemplate, deleteTemplate };
}
