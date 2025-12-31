INSERT INTO roles (name, description) VALUES
('Medico', 'Perfil para médicos'),
('Enfermeiro', 'Perfil para enfermeiros'),
('Tecnico de Enfermagem', 'Perfil para técnicos de enfermagem'),
('Dentista', 'Perfil para dentistas'),
('Agente de saude', 'Perfil para agentes de saúde')
ON CONFLICT (name) DO NOTHING;
