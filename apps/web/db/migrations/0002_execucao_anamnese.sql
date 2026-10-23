-- Biblioteca com imagens, registro de cargas por série e anamnese no primeiro acesso.

ALTER TABLE "Exercise" ADD COLUMN "equipment" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "images" TEXT[];

ALTER TABLE "WorkoutLog" ADD COLUMN "durationSec" INTEGER;

CREATE TABLE "WorkoutSetLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "workoutLogId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER,
    "loadKg" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutSetLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkoutSetLog_studentId_exerciseId_idx" ON "WorkoutSetLog"("studentId", "exerciseId", "createdAt");
CREATE INDEX "WorkoutSetLog_workoutLogId_idx" ON "WorkoutSetLog"("workoutLogId");
ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSetLog" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "Anamnesis" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "hasRisk" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Anamnesis_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Anamnesis_studentId_key" ON "Anamnesis"("studentId");
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Anamnesis" ENABLE ROW LEVEL SECURITY;

-- Biblioteca global (imagens: free-exercise-db, domínio público). Gerado por scripts/exercise-library.py
INSERT INTO "Exercise" ("id", "tenantId", "name", "muscleGroup", "equipment", "instructions", "images") VALUES
('ex_supino_reto', NULL, 'Supino reto com barra', 'Peito', 'Barra', 'Deite no banco com os pés firmes no chão. Desça a barra até o meio do peito e empurre de volta, sem tirar o quadril do banco.', ARRAY['/exercicios/ex_supino_reto/0.jpg','/exercicios/ex_supino_reto/1.jpg']::TEXT[]),
('ex_supino_halteres', NULL, 'Supino reto com halteres', 'Peito', 'Halter', 'Deitado no banco, desça os halteres até a linha do peito com os cotovelos a 45° do tronco e empurre para cima.', ARRAY['/exercicios/ex_supino_halteres/0.jpg','/exercicios/ex_supino_halteres/1.jpg']::TEXT[]),
('ex_supino_inclinado', NULL, 'Supino inclinado com halteres', 'Peito', 'Halter', 'Banco inclinado entre 30° e 45°. Desça os halteres até a linha do peito e empurre para cima, aproximando-os no topo.', ARRAY['/exercicios/ex_supino_inclinado/0.jpg','/exercicios/ex_supino_inclinado/1.jpg']::TEXT[]),
('ex_crucifixo', NULL, 'Crucifixo com halteres', 'Peito', 'Halter', 'Com os cotovelos levemente flexionados, abra os braços até sentir o peito alongar e feche em arco.', ARRAY['/exercicios/ex_crucifixo/0.jpg','/exercicios/ex_crucifixo/1.jpg']::TEXT[]),
('ex_crossover', NULL, 'Crossover na polia', 'Peito', 'Polia', 'Em pé entre as polias, puxe as alças em arco à frente do corpo até as mãos se encontrarem. Volte devagar.', ARRAY['/exercicios/ex_crossover/0.jpg','/exercicios/ex_crossover/1.jpg']::TEXT[]),
('ex_flexao', NULL, 'Flexão de braços', 'Peito', 'Peso corporal', 'Mãos um pouco além da largura dos ombros e corpo alinhado. Desça o peito até perto do chão e empurre.', ARRAY['/exercicios/ex_flexao/0.jpg','/exercicios/ex_flexao/1.jpg']::TEXT[]),
('ex_puxada_frente', NULL, 'Puxada frontal na polia', 'Costas', 'Polia', 'Pegada aberta. Puxe a barra até o alto do peito levando os cotovelos para baixo e suba controlando.', ARRAY['/exercicios/ex_puxada_frente/0.jpg','/exercicios/ex_puxada_frente/1.jpg']::TEXT[]),
('ex_puxada_fechada', NULL, 'Puxada frontal pegada fechada', 'Costas', 'Polia', 'Pegada fechada. Puxe a barra até o peito mantendo o tronco firme e estenda os braços devagar.', ARRAY['/exercicios/ex_puxada_fechada/0.jpg','/exercicios/ex_puxada_fechada/1.jpg']::TEXT[]),
('ex_remada_curvada', NULL, 'Remada curvada com barra', 'Costas', 'Barra', 'Tronco inclinado à frente e coluna neutra. Puxe a barra em direção ao umbigo e desça controlando.', ARRAY['/exercicios/ex_remada_curvada/0.jpg','/exercicios/ex_remada_curvada/1.jpg']::TEXT[]),
('ex_remada_baixa', NULL, 'Remada baixa na polia', 'Costas', 'Polia', 'Sentado e com o tronco ereto, puxe o triângulo até o abdômen juntando as escápulas. Estenda os braços devagar.', ARRAY['/exercicios/ex_remada_baixa/0.jpg','/exercicios/ex_remada_baixa/1.jpg']::TEXT[]),
('ex_remada_unilateral', NULL, 'Remada unilateral com halter', 'Costas', 'Halter', 'Apoie mão e joelho no banco. Puxe o halter até a lateral do tronco, mantendo as costas retas.', ARRAY['/exercicios/ex_remada_unilateral/0.jpg','/exercicios/ex_remada_unilateral/1.jpg']::TEXT[]),
('ex_barra_fixa', NULL, 'Barra fixa', 'Costas', 'Peso corporal', 'Pegada pronada. Puxe o corpo até o queixo passar da barra e desça até estender os braços.', ARRAY['/exercicios/ex_barra_fixa/0.jpg','/exercicios/ex_barra_fixa/1.jpg']::TEXT[]),
('ex_levantamento_terra', NULL, 'Levantamento terra', 'Lombar', 'Barra', 'Barra perto das canelas e coluna neutra. Empurre o chão com as pernas e estenda o quadril até ficar em pé.', ARRAY['/exercicios/ex_levantamento_terra/0.jpg','/exercicios/ex_levantamento_terra/1.jpg']::TEXT[]),
('ex_hiperextensao', NULL, 'Hiperextensão lombar', 'Lombar', 'Máquina', 'Quadril apoiado no aparelho. Desça o tronco com a coluna neutra e suba até alinhar com as pernas, sem hiperestender.', ARRAY['/exercicios/ex_hiperextensao/0.jpg','/exercicios/ex_hiperextensao/1.jpg']::TEXT[]),
('ex_desenvolvimento', NULL, 'Desenvolvimento com halteres', 'Ombros', 'Halter', 'Sentado com apoio nas costas, empurre os halteres acima da cabeça sem travar os cotovelos e desça até a altura das orelhas.', ARRAY['/exercicios/ex_desenvolvimento/0.jpg','/exercicios/ex_desenvolvimento/1.jpg']::TEXT[]),
('ex_desenvolvimento_arnold', NULL, 'Desenvolvimento Arnold', 'Ombros', 'Halter', 'Comece com as palmas voltadas para você na altura do queixo. Gire os punhos enquanto empurra os halteres para cima.', ARRAY['/exercicios/ex_desenvolvimento_arnold/0.jpg','/exercicios/ex_desenvolvimento_arnold/1.jpg']::TEXT[]),
('ex_elevacao_lateral', NULL, 'Elevação lateral', 'Ombros', 'Halter', 'Eleve os halteres pelas laterais até a altura dos ombros, com os cotovelos levemente flexionados. Desça devagar.', ARRAY['/exercicios/ex_elevacao_lateral/0.jpg','/exercicios/ex_elevacao_lateral/1.jpg']::TEXT[]),
('ex_elevacao_frontal', NULL, 'Elevação frontal', 'Ombros', 'Halter', 'Eleve os halteres à frente até a altura dos ombros, sem balançar o tronco.', ARRAY['/exercicios/ex_elevacao_frontal/0.jpg','/exercicios/ex_elevacao_frontal/1.jpg']::TEXT[]),
('ex_crucifixo_inverso', NULL, 'Crucifixo inverso', 'Ombros', 'Halter', 'Tronco inclinado à frente. Abra os braços para os lados até a linha dos ombros, contraindo a parte de trás do ombro.', ARRAY['/exercicios/ex_crucifixo_inverso/0.jpg','/exercicios/ex_crucifixo_inverso/1.jpg']::TEXT[]),
('ex_face_pull', NULL, 'Face pull na polia', 'Ombros', 'Polia', 'Corda na altura do rosto. Puxe em direção à testa abrindo os cotovelos e girando os ombros para fora.', ARRAY['/exercicios/ex_face_pull/0.jpg','/exercicios/ex_face_pull/1.jpg']::TEXT[]),
('ex_remada_alta', NULL, 'Remada alta com barra', 'Ombros', 'Barra', 'Pegada na largura dos ombros. Puxe a barra rente ao corpo até a altura do peito, cotovelos acima das mãos.', ARRAY['/exercicios/ex_remada_alta/0.jpg','/exercicios/ex_remada_alta/1.jpg']::TEXT[]),
('ex_encolhimento', NULL, 'Encolhimento com barra', 'Trapézio', 'Barra', 'Braços estendidos segurando a barra. Eleve os ombros em direção às orelhas, segure um segundo e desça.', ARRAY['/exercicios/ex_encolhimento/0.jpg','/exercicios/ex_encolhimento/1.jpg']::TEXT[]),
('ex_rosca_direta', NULL, 'Rosca direta com barra', 'Bíceps', 'Barra', 'Cotovelos junto ao corpo. Suba a barra flexionando os cotovelos e desça sem balançar o tronco.', ARRAY['/exercicios/ex_rosca_direta/0.jpg','/exercicios/ex_rosca_direta/1.jpg']::TEXT[]),
('ex_rosca_alternada', NULL, 'Rosca alternada com halteres', 'Bíceps', 'Halter', 'Suba um halter de cada vez, girando a palma para cima durante a subida.', ARRAY['/exercicios/ex_rosca_alternada/0.jpg','/exercicios/ex_rosca_alternada/1.jpg']::TEXT[]),
('ex_rosca_martelo', NULL, 'Rosca martelo', 'Bíceps', 'Halter', 'Palmas voltadas uma para a outra. Suba os halteres mantendo os cotovelos fixos ao lado do corpo.', ARRAY['/exercicios/ex_rosca_martelo/0.jpg','/exercicios/ex_rosca_martelo/1.jpg']::TEXT[]),
('ex_triceps_polia', NULL, 'Tríceps na polia', 'Tríceps', 'Polia', 'Cotovelos colados ao corpo. Estenda os braços empurrando a barra para baixo e volte até 90°.', ARRAY['/exercicios/ex_triceps_polia/0.jpg','/exercicios/ex_triceps_polia/1.jpg']::TEXT[]),
('ex_triceps_corda', NULL, 'Tríceps na polia com corda', 'Tríceps', 'Polia', 'Cotovelos fixos. Empurre a corda para baixo e afaste as pontas no final do movimento.', ARRAY['/exercicios/ex_triceps_corda/0.jpg','/exercicios/ex_triceps_corda/1.jpg']::TEXT[]),
('ex_triceps_frances', NULL, 'Tríceps testa com barra W', 'Tríceps', 'Barra', 'Deitado, braços estendidos acima do peito. Flexione só os cotovelos levando a barra em direção à testa e estenda.', ARRAY['/exercicios/ex_triceps_frances/0.jpg','/exercicios/ex_triceps_frances/1.jpg']::TEXT[]),
('ex_mergulho', NULL, 'Mergulho no banco', 'Tríceps', 'Peso corporal', 'Mãos no banco atrás do corpo. Desça flexionando os cotovelos até 90° e empurre de volta.', ARRAY['/exercicios/ex_mergulho/0.jpg','/exercicios/ex_mergulho/1.jpg']::TEXT[]),
('ex_paralelas', NULL, 'Paralelas', 'Tríceps', 'Peso corporal', 'Corpo ereto entre as barras. Desça até os cotovelos formarem 90° e empurre até estender os braços.', ARRAY['/exercicios/ex_paralelas/0.jpg','/exercicios/ex_paralelas/1.jpg']::TEXT[]),
('ex_agachamento_livre', NULL, 'Agachamento livre', 'Quadríceps', 'Barra', 'Barra apoiada no trapézio e pés na largura dos ombros. Desça como se fosse sentar, joelhos alinhados aos pés, e suba.', ARRAY['/exercicios/ex_agachamento_livre/0.jpg','/exercicios/ex_agachamento_livre/1.jpg']::TEXT[]),
('ex_agachamento_goblet', NULL, 'Agachamento goblet', 'Quadríceps', 'Kettlebell', 'Segure o peso junto ao peito. Agache mantendo o tronco ereto e os cotovelos entre os joelhos.', ARRAY['/exercicios/ex_agachamento_goblet/0.jpg','/exercicios/ex_agachamento_goblet/1.jpg']::TEXT[]),
('ex_agachamento_peso_corpo', NULL, 'Agachamento sem peso', 'Quadríceps', 'Peso corporal', 'Braços à frente para equilibrar. Desça até as coxas ficarem paralelas ao chão e suba empurrando pelos calcanhares.', ARRAY['/exercicios/ex_agachamento_peso_corpo/0.jpg','/exercicios/ex_agachamento_peso_corpo/1.jpg']::TEXT[]),
('ex_agachamento_smith', NULL, 'Agachamento no Smith', 'Quadríceps', 'Máquina', 'Barra guiada no trapézio, pés levemente à frente. Desça controlando e suba sem travar os joelhos.', ARRAY['/exercicios/ex_agachamento_smith/0.jpg','/exercicios/ex_agachamento_smith/1.jpg']::TEXT[]),
('ex_agachamento_bulgaro', NULL, 'Agachamento búlgaro', 'Quadríceps', 'Halter', 'Pé de trás apoiado num banco. Desça até a coxa da frente ficar paralela ao chão e suba empurrando pelo calcanhar.', ARRAY['/exercicios/ex_agachamento_bulgaro/0.jpg','/exercicios/ex_agachamento_bulgaro/1.jpg']::TEXT[]),
('ex_leg_press', NULL, 'Leg press 45°', 'Quadríceps', 'Máquina', 'Pés na largura dos ombros na plataforma. Desça até os joelhos formarem 90° e empurre sem travar os joelhos.', ARRAY['/exercicios/ex_leg_press/0.jpg','/exercicios/ex_leg_press/1.jpg']::TEXT[]),
('ex_cadeira_extensora', NULL, 'Cadeira extensora', 'Quadríceps', 'Máquina', 'Ajuste o apoio acima dos tornozelos. Estenda as pernas até em cima, segure um segundo e desça devagar.', ARRAY['/exercicios/ex_cadeira_extensora/0.jpg','/exercicios/ex_cadeira_extensora/1.jpg']::TEXT[]),
('ex_afundo', NULL, 'Afundo com halteres', 'Quadríceps', 'Halter', 'Dê um passo à frente e desça até os dois joelhos formarem 90°. Volte à posição inicial e alterne as pernas.', ARRAY['/exercicios/ex_afundo/0.jpg','/exercicios/ex_afundo/1.jpg']::TEXT[]),
('ex_subida_banco', NULL, 'Subida no banco com halteres', 'Quadríceps', 'Halter', 'Suba no banco apoiando o pé inteiro e empurrando pelo calcanhar. Desça controlando e alterne.', ARRAY['/exercicios/ex_subida_banco/0.jpg','/exercicios/ex_subida_banco/1.jpg']::TEXT[]),
('ex_mesa_flexora', NULL, 'Mesa flexora', 'Posteriores de coxa', 'Máquina', 'Deitado de bruços, flexione os joelhos levando o apoio em direção aos glúteos e desça devagar.', ARRAY['/exercicios/ex_mesa_flexora/0.jpg','/exercicios/ex_mesa_flexora/1.jpg']::TEXT[]),
('ex_stiff', NULL, 'Stiff com barra', 'Posteriores de coxa', 'Barra', 'Joelhos quase estendidos. Desça a barra rente às pernas levando o quadril para trás e suba contraindo os glúteos.', ARRAY['/exercicios/ex_stiff/0.jpg','/exercicios/ex_stiff/1.jpg']::TEXT[]),
('ex_terra_romeno', NULL, 'Levantamento terra romeno', 'Posteriores de coxa', 'Barra', 'Joelhos levemente flexionados. Leve o quadril para trás descendo a barra até o meio da canela e volte.', ARRAY['/exercicios/ex_terra_romeno/0.jpg','/exercicios/ex_terra_romeno/1.jpg']::TEXT[]),
('ex_elevacao_pelvica', NULL, 'Elevação pélvica', 'Glúteos', 'Barra', 'Costas apoiadas no banco e barra no quadril. Suba o quadril até alinhar com o tronco e contraia os glúteos no topo.', ARRAY['/exercicios/ex_elevacao_pelvica/0.jpg','/exercicios/ex_elevacao_pelvica/1.jpg']::TEXT[]),
('ex_ponte_gluteo', NULL, 'Ponte de glúteo', 'Glúteos', 'Peso corporal', 'Deitado com os joelhos flexionados. Eleve o quadril até alinhar com os joelhos e desça devagar.', ARRAY['/exercicios/ex_ponte_gluteo/0.jpg','/exercicios/ex_ponte_gluteo/1.jpg']::TEXT[]),
('ex_abducao', NULL, 'Cadeira abdutora', 'Glúteos', 'Máquina', 'Sentado com as costas apoiadas. Afaste as pernas contra a resistência e volte controlando.', ARRAY['/exercicios/ex_abducao/0.jpg','/exercicios/ex_abducao/1.jpg']::TEXT[]),
('ex_coice', NULL, 'Coice de glúteo', 'Glúteos', 'Peso corporal', 'Em quatro apoios, estenda uma perna para trás e para cima contraindo o glúteo. Volte sem arquear a lombar.', ARRAY['/exercicios/ex_coice/0.jpg','/exercicios/ex_coice/1.jpg']::TEXT[]),
('ex_panturrilha', NULL, 'Panturrilha em pé', 'Panturrilhas', 'Máquina', 'Ponta dos pés no apoio. Suba o máximo que puder, segure um segundo e desça alongando bem.', ARRAY['/exercicios/ex_panturrilha/0.jpg','/exercicios/ex_panturrilha/1.jpg']::TEXT[]),
('ex_panturrilha_sentado', NULL, 'Panturrilha sentado', 'Panturrilhas', 'Máquina', 'Sentado com o apoio sobre os joelhos. Eleve os calcanhares o máximo possível e desça devagar.', ARRAY['/exercicios/ex_panturrilha_sentado/0.jpg','/exercicios/ex_panturrilha_sentado/1.jpg']::TEXT[]),
('ex_prancha', NULL, 'Prancha isométrica', 'Abdômen', 'Peso corporal', 'Apoie antebraços e pontas dos pés. Mantenha o corpo alinhado, abdômen contraído e sem deixar o quadril cair.', ARRAY['/exercicios/ex_prancha/0.jpg','/exercicios/ex_prancha/1.jpg']::TEXT[]),
('ex_abdominal', NULL, 'Abdominal supra', 'Abdômen', 'Peso corporal', 'Deitado com os joelhos flexionados. Eleve os ombros do chão contraindo o abdômen, sem puxar o pescoço.', ARRAY['/exercicios/ex_abdominal/0.jpg','/exercicios/ex_abdominal/1.jpg']::TEXT[]),
('ex_prancha_lateral', NULL, 'Prancha lateral', 'Abdômen', 'Peso corporal', 'Apoiado no antebraço e na lateral do pé, mantenha o corpo alinhado sem deixar o quadril cair.', ARRAY['/exercicios/ex_prancha_lateral/0.jpg','/exercicios/ex_prancha_lateral/1.jpg']::TEXT[]),
('ex_dead_bug', NULL, 'Dead bug', 'Abdômen', 'Peso corporal', 'Deitado com braços e pernas para cima. Estenda braço e perna opostos sem tirar a lombar do chão e alterne.', ARRAY['/exercicios/ex_dead_bug/0.jpg','/exercicios/ex_dead_bug/1.jpg']::TEXT[]),
('ex_elevacao_pernas', NULL, 'Elevação de pernas na barra', 'Abdômen', 'Peso corporal', 'Pendurado na barra, eleve as pernas até a altura do quadril sem balançar o corpo e desça controlando.', ARRAY['/exercicios/ex_elevacao_pernas/0.jpg','/exercicios/ex_elevacao_pernas/1.jpg']::TEXT[]),
('ex_abdominal_russo', NULL, 'Giro russo', 'Abdômen', 'Peso corporal', 'Sentado com o tronco inclinado para trás, gire o tronco de um lado para o outro mantendo o abdômen firme.', ARRAY['/exercicios/ex_abdominal_russo/0.jpg','/exercicios/ex_abdominal_russo/1.jpg']::TEXT[]),
('ex_burpee', NULL, 'Burpee', 'Funcional', 'Peso corporal', 'Agache, apoie as mãos, jogue as pernas para trás, faça uma flexão, volte e salte com os braços para cima.', NULL),
('ex_kettlebell_swing', NULL, 'Kettlebell swing', 'Funcional', 'Kettlebell', 'Leve o quadril para trás e projete o kettlebell à frente com a força do quadril, não dos braços.', ARRAY['/exercicios/ex_kettlebell_swing/0.jpg','/exercicios/ex_kettlebell_swing/1.jpg']::TEXT[]),
('ex_escalador', NULL, 'Escalador', 'Funcional', 'Peso corporal', 'Em posição de prancha alta, leve os joelhos ao peito alternadamente em ritmo rápido.', ARRAY['/exercicios/ex_escalador/0.jpg','/exercicios/ex_escalador/1.jpg']::TEXT[]),
('ex_salto_caixa', NULL, 'Salto na caixa', 'Funcional', 'Outros', 'Salte sobre a caixa aterrissando com os dois pés e joelhos semiflexionados. Desça com cuidado.', ARRAY['/exercicios/ex_salto_caixa/0.jpg','/exercicios/ex_salto_caixa/1.jpg']::TEXT[]),
('ex_corda_naval', NULL, 'Corda naval', 'Funcional', 'Outros', 'Pés na largura dos ombros e joelhos flexionados. Faça ondas alternadas com as cordas mantendo o ritmo.', ARRAY['/exercicios/ex_corda_naval/0.jpg','/exercicios/ex_corda_naval/1.jpg']::TEXT[]),
('ex_esteira', NULL, 'Esteira', 'Cardio', 'Máquina', 'Ajuste velocidade e inclinação conforme o treino. Mantenha a postura ereta sem se apoiar nas laterais.', ARRAY['/exercicios/ex_esteira/0.jpg','/exercicios/ex_esteira/1.jpg']::TEXT[]),
('ex_bike', NULL, 'Bicicleta ergométrica', 'Cardio', 'Máquina', 'Ajuste o banco na altura do quadril. Pedale mantendo o ritmo e a carga indicados no treino.', ARRAY['/exercicios/ex_bike/0.jpg','/exercicios/ex_bike/1.jpg']::TEXT[]),
('ex_eliptico', NULL, 'Elíptico', 'Cardio', 'Máquina', 'Mantenha o tronco ereto e use braços e pernas de forma coordenada no ritmo indicado.', ARRAY['/exercicios/ex_eliptico/0.jpg','/exercicios/ex_eliptico/1.jpg']::TEXT[]),
('ex_pular_corda', NULL, 'Pular corda', 'Cardio', 'Outros', 'Saltos baixos na ponta dos pés, girando a corda com os punhos e cotovelos perto do corpo.', ARRAY['/exercicios/ex_pular_corda/0.jpg','/exercicios/ex_pular_corda/1.jpg']::TEXT[])
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "muscleGroup" = EXCLUDED."muscleGroup", "equipment" = EXCLUDED."equipment", "instructions" = EXCLUDED."instructions", "images" = EXCLUDED."images";

