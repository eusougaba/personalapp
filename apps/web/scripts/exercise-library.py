"""Gera a biblioteca global de exercícios (SQL + imagens otimizadas).

Imagens: free-exercise-db (https://github.com/yuhonas/free-exercise-db), domínio público (Unlicense).
Organização por grupo muscular e equipamento inspirada no MuscleWiki (sem copiar conteúdo).

Uso: python3 scripts/exercise-library.py <pasta do free-exercise-db>
Saídas: public/exercicios/<id>/{0,1}.jpg e db/migrations/0002_execucao_anamnese.sql (bloco da biblioteca)
"""
import os
import sys

# id, id no free-exercise-db (ou None), nome, grupo, equipamento, instruções
LIB = [
    ("ex_supino_reto", "Barbell_Bench_Press_-_Medium_Grip", "Supino reto com barra", "Peito", "Barra",
     "Deite no banco com os pés firmes no chão. Desça a barra até o meio do peito e empurre de volta, sem tirar o quadril do banco."),
    ("ex_supino_halteres", "Dumbbell_Bench_Press", "Supino reto com halteres", "Peito", "Halter",
     "Deitado no banco, desça os halteres até a linha do peito com os cotovelos a 45° do tronco e empurre para cima."),
    ("ex_supino_inclinado", "Incline_Dumbbell_Press", "Supino inclinado com halteres", "Peito", "Halter",
     "Banco inclinado entre 30° e 45°. Desça os halteres até a linha do peito e empurre para cima, aproximando-os no topo."),
    ("ex_crucifixo", "Dumbbell_Flyes", "Crucifixo com halteres", "Peito", "Halter",
     "Com os cotovelos levemente flexionados, abra os braços até sentir o peito alongar e feche em arco."),
    ("ex_crossover", "Cable_Crossover", "Crossover na polia", "Peito", "Polia",
     "Em pé entre as polias, puxe as alças em arco à frente do corpo até as mãos se encontrarem. Volte devagar."),
    ("ex_flexao", "Pushups", "Flexão de braços", "Peito", "Peso corporal",
     "Mãos um pouco além da largura dos ombros e corpo alinhado. Desça o peito até perto do chão e empurre."),
    ("ex_puxada_frente", "Wide-Grip_Lat_Pulldown", "Puxada frontal na polia", "Costas", "Polia",
     "Pegada aberta. Puxe a barra até o alto do peito levando os cotovelos para baixo e suba controlando."),
    ("ex_puxada_fechada", "Close-Grip_Front_Lat_Pulldown", "Puxada frontal pegada fechada", "Costas", "Polia",
     "Pegada fechada. Puxe a barra até o peito mantendo o tronco firme e estenda os braços devagar."),
    ("ex_remada_curvada", "Bent_Over_Barbell_Row", "Remada curvada com barra", "Costas", "Barra",
     "Tronco inclinado à frente e coluna neutra. Puxe a barra em direção ao umbigo e desça controlando."),
    ("ex_remada_baixa", "Seated_Cable_Rows", "Remada baixa na polia", "Costas", "Polia",
     "Sentado e com o tronco ereto, puxe o triângulo até o abdômen juntando as escápulas. Estenda os braços devagar."),
    ("ex_remada_unilateral", "One-Arm_Dumbbell_Row", "Remada unilateral com halter", "Costas", "Halter",
     "Apoie mão e joelho no banco. Puxe o halter até a lateral do tronco, mantendo as costas retas."),
    ("ex_barra_fixa", "Pullups", "Barra fixa", "Costas", "Peso corporal",
     "Pegada pronada. Puxe o corpo até o queixo passar da barra e desça até estender os braços."),
    ("ex_levantamento_terra", "Barbell_Deadlift", "Levantamento terra", "Lombar", "Barra",
     "Barra perto das canelas e coluna neutra. Empurre o chão com as pernas e estenda o quadril até ficar em pé."),
    ("ex_hiperextensao", "Hyperextensions_Back_Extensions", "Hiperextensão lombar", "Lombar", "Máquina",
     "Quadril apoiado no aparelho. Desça o tronco com a coluna neutra e suba até alinhar com as pernas, sem hiperestender."),
    ("ex_desenvolvimento", "Dumbbell_Shoulder_Press", "Desenvolvimento com halteres", "Ombros", "Halter",
     "Sentado com apoio nas costas, empurre os halteres acima da cabeça sem travar os cotovelos e desça até a altura das orelhas."),
    ("ex_desenvolvimento_arnold", "Arnold_Dumbbell_Press", "Desenvolvimento Arnold", "Ombros", "Halter",
     "Comece com as palmas voltadas para você na altura do queixo. Gire os punhos enquanto empurra os halteres para cima."),
    ("ex_elevacao_lateral", "Side_Lateral_Raise", "Elevação lateral", "Ombros", "Halter",
     "Eleve os halteres pelas laterais até a altura dos ombros, com os cotovelos levemente flexionados. Desça devagar."),
    ("ex_elevacao_frontal", "Front_Dumbbell_Raise", "Elevação frontal", "Ombros", "Halter",
     "Eleve os halteres à frente até a altura dos ombros, sem balançar o tronco."),
    ("ex_crucifixo_inverso", "Reverse_Flyes", "Crucifixo inverso", "Ombros", "Halter",
     "Tronco inclinado à frente. Abra os braços para os lados até a linha dos ombros, contraindo a parte de trás do ombro."),
    ("ex_face_pull", "Face_Pull", "Face pull na polia", "Ombros", "Polia",
     "Corda na altura do rosto. Puxe em direção à testa abrindo os cotovelos e girando os ombros para fora."),
    ("ex_remada_alta", "Upright_Barbell_Row", "Remada alta com barra", "Ombros", "Barra",
     "Pegada na largura dos ombros. Puxe a barra rente ao corpo até a altura do peito, cotovelos acima das mãos."),
    ("ex_encolhimento", "Barbell_Shrug", "Encolhimento com barra", "Trapézio", "Barra",
     "Braços estendidos segurando a barra. Eleve os ombros em direção às orelhas, segure um segundo e desça."),
    ("ex_rosca_direta", "Barbell_Curl", "Rosca direta com barra", "Bíceps", "Barra",
     "Cotovelos junto ao corpo. Suba a barra flexionando os cotovelos e desça sem balançar o tronco."),
    ("ex_rosca_alternada", "Dumbbell_Alternate_Bicep_Curl", "Rosca alternada com halteres", "Bíceps", "Halter",
     "Suba um halter de cada vez, girando a palma para cima durante a subida."),
    ("ex_rosca_martelo", "Hammer_Curls", "Rosca martelo", "Bíceps", "Halter",
     "Palmas voltadas uma para a outra. Suba os halteres mantendo os cotovelos fixos ao lado do corpo."),
    ("ex_triceps_polia", "Triceps_Pushdown", "Tríceps na polia", "Tríceps", "Polia",
     "Cotovelos colados ao corpo. Estenda os braços empurrando a barra para baixo e volte até 90°."),
    ("ex_triceps_corda", "Triceps_Pushdown_-_Rope_Attachment", "Tríceps na polia com corda", "Tríceps", "Polia",
     "Cotovelos fixos. Empurre a corda para baixo e afaste as pontas no final do movimento."),
    ("ex_triceps_frances", "EZ-Bar_Skullcrusher", "Tríceps testa com barra W", "Tríceps", "Barra",
     "Deitado, braços estendidos acima do peito. Flexione só os cotovelos levando a barra em direção à testa e estenda."),
    ("ex_mergulho", "Bench_Dips", "Mergulho no banco", "Tríceps", "Peso corporal",
     "Mãos no banco atrás do corpo. Desça flexionando os cotovelos até 90° e empurre de volta."),
    ("ex_paralelas", "Dips_-_Triceps_Version", "Paralelas", "Tríceps", "Peso corporal",
     "Corpo ereto entre as barras. Desça até os cotovelos formarem 90° e empurre até estender os braços."),
    ("ex_agachamento_livre", "Barbell_Squat", "Agachamento livre", "Quadríceps", "Barra",
     "Barra apoiada no trapézio e pés na largura dos ombros. Desça como se fosse sentar, joelhos alinhados aos pés, e suba."),
    ("ex_agachamento_goblet", "Goblet_Squat", "Agachamento goblet", "Quadríceps", "Kettlebell",
     "Segure o peso junto ao peito. Agache mantendo o tronco ereto e os cotovelos entre os joelhos."),
    ("ex_agachamento_peso_corpo", "Bodyweight_Squat", "Agachamento sem peso", "Quadríceps", "Peso corporal",
     "Braços à frente para equilibrar. Desça até as coxas ficarem paralelas ao chão e suba empurrando pelos calcanhares."),
    ("ex_agachamento_smith", "Smith_Machine_Squat", "Agachamento no Smith", "Quadríceps", "Máquina",
     "Barra guiada no trapézio, pés levemente à frente. Desça controlando e suba sem travar os joelhos."),
    ("ex_agachamento_bulgaro", "Split_Squat_with_Dumbbells", "Agachamento búlgaro", "Quadríceps", "Halter",
     "Pé de trás apoiado num banco. Desça até a coxa da frente ficar paralela ao chão e suba empurrando pelo calcanhar."),
    ("ex_leg_press", "Leg_Press", "Leg press 45°", "Quadríceps", "Máquina",
     "Pés na largura dos ombros na plataforma. Desça até os joelhos formarem 90° e empurre sem travar os joelhos."),
    ("ex_cadeira_extensora", "Leg_Extensions", "Cadeira extensora", "Quadríceps", "Máquina",
     "Ajuste o apoio acima dos tornozelos. Estenda as pernas até em cima, segure um segundo e desça devagar."),
    ("ex_afundo", "Dumbbell_Lunges", "Afundo com halteres", "Quadríceps", "Halter",
     "Dê um passo à frente e desça até os dois joelhos formarem 90°. Volte à posição inicial e alterne as pernas."),
    ("ex_subida_banco", "Dumbbell_Step_Ups", "Subida no banco com halteres", "Quadríceps", "Halter",
     "Suba no banco apoiando o pé inteiro e empurrando pelo calcanhar. Desça controlando e alterne."),
    ("ex_mesa_flexora", "Lying_Leg_Curls", "Mesa flexora", "Posteriores de coxa", "Máquina",
     "Deitado de bruços, flexione os joelhos levando o apoio em direção aos glúteos e desça devagar."),
    ("ex_stiff", "Stiff-Legged_Barbell_Deadlift", "Stiff com barra", "Posteriores de coxa", "Barra",
     "Joelhos quase estendidos. Desça a barra rente às pernas levando o quadril para trás e suba contraindo os glúteos."),
    ("ex_terra_romeno", "Romanian_Deadlift", "Levantamento terra romeno", "Posteriores de coxa", "Barra",
     "Joelhos levemente flexionados. Leve o quadril para trás descendo a barra até o meio da canela e volte."),
    ("ex_elevacao_pelvica", "Barbell_Hip_Thrust", "Elevação pélvica", "Glúteos", "Barra",
     "Costas apoiadas no banco e barra no quadril. Suba o quadril até alinhar com o tronco e contraia os glúteos no topo."),
    ("ex_ponte_gluteo", "Butt_Lift_Bridge", "Ponte de glúteo", "Glúteos", "Peso corporal",
     "Deitado com os joelhos flexionados. Eleve o quadril até alinhar com os joelhos e desça devagar."),
    ("ex_abducao", "Thigh_Abductor", "Cadeira abdutora", "Glúteos", "Máquina",
     "Sentado com as costas apoiadas. Afaste as pernas contra a resistência e volte controlando."),
    ("ex_coice", "Glute_Kickback", "Coice de glúteo", "Glúteos", "Peso corporal",
     "Em quatro apoios, estenda uma perna para trás e para cima contraindo o glúteo. Volte sem arquear a lombar."),
    ("ex_panturrilha", "Standing_Calf_Raises", "Panturrilha em pé", "Panturrilhas", "Máquina",
     "Ponta dos pés no apoio. Suba o máximo que puder, segure um segundo e desça alongando bem."),
    ("ex_panturrilha_sentado", "Seated_Calf_Raise", "Panturrilha sentado", "Panturrilhas", "Máquina",
     "Sentado com o apoio sobre os joelhos. Eleve os calcanhares o máximo possível e desça devagar."),
    ("ex_prancha", "Plank", "Prancha isométrica", "Abdômen", "Peso corporal",
     "Apoie antebraços e pontas dos pés. Mantenha o corpo alinhado, abdômen contraído e sem deixar o quadril cair."),
    ("ex_abdominal", "Crunches", "Abdominal supra", "Abdômen", "Peso corporal",
     "Deitado com os joelhos flexionados. Eleve os ombros do chão contraindo o abdômen, sem puxar o pescoço."),
    ("ex_prancha_lateral", "Side_Bridge", "Prancha lateral", "Abdômen", "Peso corporal",
     "Apoiado no antebraço e na lateral do pé, mantenha o corpo alinhado sem deixar o quadril cair."),
    ("ex_dead_bug", "Dead_Bug", "Dead bug", "Abdômen", "Peso corporal",
     "Deitado com braços e pernas para cima. Estenda braço e perna opostos sem tirar a lombar do chão e alterne."),
    ("ex_elevacao_pernas", "Hanging_Leg_Raise", "Elevação de pernas na barra", "Abdômen", "Peso corporal",
     "Pendurado na barra, eleve as pernas até a altura do quadril sem balançar o corpo e desça controlando."),
    ("ex_abdominal_russo", "Russian_Twist", "Giro russo", "Abdômen", "Peso corporal",
     "Sentado com o tronco inclinado para trás, gire o tronco de um lado para o outro mantendo o abdômen firme."),
    ("ex_burpee", None, "Burpee", "Funcional", "Peso corporal",
     "Agache, apoie as mãos, jogue as pernas para trás, faça uma flexão, volte e salte com os braços para cima."),
    ("ex_kettlebell_swing", "One-Arm_Kettlebell_Swings", "Kettlebell swing", "Funcional", "Kettlebell",
     "Leve o quadril para trás e projete o kettlebell à frente com a força do quadril, não dos braços."),
    ("ex_escalador", "Mountain_Climbers", "Escalador", "Funcional", "Peso corporal",
     "Em posição de prancha alta, leve os joelhos ao peito alternadamente em ritmo rápido."),
    ("ex_salto_caixa", "Box_Jump_Multiple_Response", "Salto na caixa", "Funcional", "Outros",
     "Salte sobre a caixa aterrissando com os dois pés e joelhos semiflexionados. Desça com cuidado."),
    ("ex_corda_naval", "Battling_Ropes", "Corda naval", "Funcional", "Outros",
     "Pés na largura dos ombros e joelhos flexionados. Faça ondas alternadas com as cordas mantendo o ritmo."),
    ("ex_esteira", "Walking_Treadmill", "Esteira", "Cardio", "Máquina",
     "Ajuste velocidade e inclinação conforme o treino. Mantenha a postura ereta sem se apoiar nas laterais."),
    ("ex_bike", "Bicycling_Stationary", "Bicicleta ergométrica", "Cardio", "Máquina",
     "Ajuste o banco na altura do quadril. Pedale mantendo o ritmo e a carga indicados no treino."),
    ("ex_eliptico", "Elliptical_Trainer", "Elíptico", "Cardio", "Máquina",
     "Mantenha o tronco ereto e use braços e pernas de forma coordenada no ritmo indicado."),
    ("ex_pular_corda", "Rope_Jumping", "Pular corda", "Cardio", "Outros",
     "Saltos baixos na ponta dos pés, girando a corda com os punhos e cotovelos perto do corpo."),
]


def q(s):
    return "NULL" if s is None else "'" + s.replace("'", "''") + "'"


def main(src):
    from PIL import Image

    here = os.path.dirname(os.path.abspath(__file__))
    pub = os.path.join(here, "..", "public", "exercicios")
    rows = []
    for ex_id, fid, name, group, equip, instr in LIB:
        images = []
        if fid:
            for n in (0, 1):
                p = os.path.join(src, "exercises", fid, f"{n}.jpg")
                if os.path.exists(p):
                    out = os.path.join(pub, ex_id)
                    os.makedirs(out, exist_ok=True)
                    im = Image.open(p).convert("RGB")
                    im.thumbnail((480, 480))
                    im.save(os.path.join(out, f"{n}.jpg"), "JPEG", quality=72, optimize=True, progressive=True)
                    images.append(f"/exercicios/{ex_id}/{n}.jpg")
        arr = "ARRAY[" + ",".join(q(i) for i in images) + "]::TEXT[]" if images else "NULL"
        rows.append(f"({q(ex_id)}, NULL, {q(name)}, {q(group)}, {q(equip)}, {q(instr)}, {arr})")
    sql = (
        'INSERT INTO "Exercise" ("id", "tenantId", "name", "muscleGroup", "equipment", "instructions", "images") VALUES\n'
        + ",\n".join(rows)
        + '\nON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "muscleGroup" = EXCLUDED."muscleGroup",'
        ' "equipment" = EXCLUDED."equipment", "instructions" = EXCLUDED."instructions", "images" = EXCLUDED."images";\n'
    )
    print(sql)


if __name__ == "__main__":
    main(sys.argv[1])
