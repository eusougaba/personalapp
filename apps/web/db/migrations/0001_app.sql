-- Campos para login, convite de aluno, Pix manual e perfil do personal + biblioteca global de exercícios.

ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

ALTER TABLE "Tenant" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "pixKey" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "bio" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "cref" TEXT;

ALTER TABLE "Student" ADD COLUMN "inviteToken" TEXT;
ALTER TABLE "Student" ADD COLUMN "goal" TEXT;
CREATE UNIQUE INDEX "Student_inviteToken_key" ON "Student"("inviteToken");

ALTER TABLE "ClassSession" ADD COLUMN "title" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "notes" TEXT;

ALTER TABLE "Invoice" ADD COLUMN "notes" TEXT;

CREATE INDEX "Attendance_studentId_idx" ON "Attendance"("studentId");
CREATE INDEX "Workout_tenantId_studentId_idx" ON "Workout"("tenantId", "studentId");
CREATE INDEX "WorkoutItem_workoutId_idx" ON "WorkoutItem"("workoutId");

INSERT INTO "Exercise" ("id", "tenantId", "name", "muscleGroup") VALUES
('ex_supino_reto', NULL, 'Supino reto com barra', 'Peito'),
('ex_supino_inclinado', NULL, 'Supino inclinado com halteres', 'Peito'),
('ex_crucifixo', NULL, 'Crucifixo com halteres', 'Peito'),
('ex_crossover', NULL, 'Crossover na polia', 'Peito'),
('ex_flexao', NULL, 'Flexão de braços', 'Peito'),
('ex_puxada_frente', NULL, 'Puxada frontal na polia', 'Costas'),
('ex_remada_curvada', NULL, 'Remada curvada com barra', 'Costas'),
('ex_remada_baixa', NULL, 'Remada baixa na polia', 'Costas'),
('ex_remada_unilateral', NULL, 'Remada unilateral com halter', 'Costas'),
('ex_barra_fixa', NULL, 'Barra fixa', 'Costas'),
('ex_levantamento_terra', NULL, 'Levantamento terra', 'Costas'),
('ex_desenvolvimento', NULL, 'Desenvolvimento com halteres', 'Ombros'),
('ex_elevacao_lateral', NULL, 'Elevação lateral', 'Ombros'),
('ex_elevacao_frontal', NULL, 'Elevação frontal', 'Ombros'),
('ex_face_pull', NULL, 'Face pull na polia', 'Ombros'),
('ex_rosca_direta', NULL, 'Rosca direta com barra', 'Bíceps'),
('ex_rosca_alternada', NULL, 'Rosca alternada com halteres', 'Bíceps'),
('ex_rosca_martelo', NULL, 'Rosca martelo', 'Bíceps'),
('ex_triceps_polia', NULL, 'Tríceps na polia', 'Tríceps'),
('ex_triceps_frances', NULL, 'Tríceps francês', 'Tríceps'),
('ex_mergulho', NULL, 'Mergulho no banco', 'Tríceps'),
('ex_agachamento_livre', NULL, 'Agachamento livre', 'Pernas'),
('ex_agachamento_bulgaro', NULL, 'Agachamento búlgaro', 'Pernas'),
('ex_leg_press', NULL, 'Leg press 45°', 'Pernas'),
('ex_cadeira_extensora', NULL, 'Cadeira extensora', 'Pernas'),
('ex_mesa_flexora', NULL, 'Mesa flexora', 'Pernas'),
('ex_stiff', NULL, 'Stiff com barra', 'Pernas'),
('ex_afundo', NULL, 'Afundo com halteres', 'Pernas'),
('ex_panturrilha', NULL, 'Panturrilha em pé', 'Pernas'),
('ex_elevacao_pelvica', NULL, 'Elevação pélvica', 'Glúteos'),
('ex_abducao', NULL, 'Cadeira abdutora', 'Glúteos'),
('ex_coice', NULL, 'Coice na polia', 'Glúteos'),
('ex_prancha', NULL, 'Prancha isométrica', 'Core'),
('ex_abdominal', NULL, 'Abdominal supra', 'Core'),
('ex_prancha_lateral', NULL, 'Prancha lateral', 'Core'),
('ex_dead_bug', NULL, 'Dead bug', 'Core'),
('ex_burpee', NULL, 'Burpee', 'Funcional'),
('ex_kettlebell_swing', NULL, 'Kettlebell swing', 'Funcional'),
('ex_corda_naval', NULL, 'Corda naval', 'Funcional'),
('ex_esteira', NULL, 'Esteira', 'Cardio'),
('ex_bike', NULL, 'Bicicleta ergométrica', 'Cardio'),
('ex_eliptico', NULL, 'Elíptico', 'Cardio'),
('ex_pular_corda', NULL, 'Pular corda', 'Cardio')
ON CONFLICT ("id") DO NOTHING;
