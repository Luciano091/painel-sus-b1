-- Garante que o usuário com id=1 (admin@esus.com) tenha o perfil com id=1 (admin).
-- Se o usuário já tiver um perfil, ele será atualizado para o perfil de admin.
-- Se não tiver, a associação será criada.
INSERT INTO auth.user_roles (user_id, role_id) VALUES (1, 1) ON CONFLICT (user_id) DO UPDATE SET role_id = EXCLUDED.role_id;
