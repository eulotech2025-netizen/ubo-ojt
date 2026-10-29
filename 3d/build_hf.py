# 블럼 리프트 HF(F자로 접힘) 단순 모형 — 상부장 하나 + 윗문이 들리고 아랫문이 세로로 매달려 따라 올라가는 움직임
# 실행: blender -b --factory-startup --python 3d/build_hf.py -- 3d   (확인용 그림 preview_*.png 도 그 폴더에 생긴다 — 올리지 않는다)
import bpy, math, sys, os

out_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.dirname(__file__)

# 빈 장면에서 시작
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)

W, D, H = 0.90, 0.35, 0.80   # 장 너비 · 깊이 · 높이 (m)
T = 0.018                    # 판 두께
TF = 0.019                   # 문 두께
h = H / 2                    # 문 한 쪽 높이 — 위아래 같다 (F자로 접히는 조건)
GAP = 0.002

def material(name, rgb, rough=0.6):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    m.diffuse_color = (*rgb, 1.0)
    return m

def srgb(hexstr):
    c = [int(hexstr[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)

M_BODY = material("몸통", srgb("EEEAE3"), 0.7)
M_FRONT = material("문", srgb("C9A27A"), 0.5)
M_LIFT = material("리프트 장치", srgb("7D838B"), 0.35)

def box(name, x0, x1, y0, y1, z0, z1, mat, origin=(0, 0, 0)):
    ox, oy, oz = origin
    v = [(x, y, z) for x in (x0 - ox, x1 - ox) for y in (y0 - oy, y1 - oy) for z in (z0 - oz, z1 - oz)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.update()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.location = origin
    bpy.context.scene.collection.objects.link(ob)
    return ob

# 몸통 — 앞이 열린 상자. 앞면은 y=0, 뒤는 +y (glTF 로 나가면 앞이 카메라 쪽)
x0, x1 = -W / 2, W / 2
box("옆판 왼쪽", x0, x0 + T, 0, D, 0, H, M_BODY)
box("옆판 오른쪽", x1 - T, x1, 0, D, 0, H, M_BODY)
box("윗판", x0 + T, x1 - T, 0, D, H - T, H, M_BODY)
box("밑판", x0 + T, x1 - T, 0, D, 0, T, M_BODY)
box("뒤판", x0 + T, x1 - T, D - 0.006, D, T, H - T, M_BODY)
box("선반", x0 + T, x1 - T, 0.02, D - 0.006, H / 2 - T / 2, H / 2 + T / 2, M_BODY)

# 리프트 장치 — 옆판 안쪽 위
for side, sx in (("왼쪽", x0 + T), ("오른쪽", x1 - T - 0.03)):
    box("리프트 장치 " + side, sx, sx + 0.03, 0.03, 0.20, H - T - 0.16, H - T - 0.02, M_LIFT)

# 문 두 쪽 — 원점을 경첩 줄에 둔다
fx0, fx1 = x0 + GAP, x1 - GAP
upper = box("윗문", fx0, fx1, -TF, 0, H - h + GAP / 2, H, M_FRONT, origin=(0, 0, H))
lower = box("아랫문", fx0, fx1, -TF, 0, H - 2 * h + GAP, H - h - GAP / 2, M_FRONT, origin=(0, 0, H - h))

# 움직임 — 윗문은 위 경첩으로 돌고, 아랫문은 세로로 선 채 윗문 끝에 매달려 따라 올라간다 (회사 확인 10-29)
scene = bpy.context.scene
scene.render.fps = 24
OPEN_DEG = 95          # 윗문이 다 열린 각도 — 아랫문은 늘 세로라 엇갈리지 않는다
frames = 96            # 4초: 열기 1초 · 멈춤 1초 · 닫기 1초 · 멈춤 1초
scene.frame_start, scene.frame_end = 1, frames

def ease(u):
    return u * u * (3 - 2 * u)

def angle_at(f):
    if f <= 24:
        return OPEN_DEG * ease((f - 1) / 23)
    if f <= 48:
        return OPEN_DEG
    if f <= 72:
        return OPEN_DEG * (1 - ease((f - 49) / 23))
    return 0.0

for f in range(1, frames + 1):
    th = math.radians(angle_at(f))
    upper.rotation_euler = (-th, 0, 0)
    lower.location = (0, -h * math.sin(th), H - h * math.cos(th))
    upper.keyframe_insert("rotation_euler", frame=f)
    lower.keyframe_insert("location", frame=f)

# 웹용 파일 — 움직임 하나로 묶어 내보낸다
glb = os.path.join(out_dir, "hf.glb")
kw = dict(filepath=glb, export_format="GLB", export_animations=True)
# 장면 모드는 기본으로 물체마다 움직임을 나눈다 — 웹 보기는 첫 움직임 하나만 틀어서 윗문이 멈춘다
bpy.ops.export_scene.gltf(export_animation_mode="SCENE", export_anim_scene_split_object=False,
                          export_nla_strips_merged_animation_name="HF 접힘", **kw)
print("GLB", glb, os.path.getsize(glb))

# 확인용 그림 — 닫힘 · 반쯤 · 열림, 앞 비스듬히 · 옆
cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
for eng in ("BLENDER_WORKBENCH", "BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    try:
        scene.render.engine = eng
        break
    except TypeError:
        continue
try:
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.show_shadows = True
except Exception:
    pass
scene.render.resolution_x, scene.render.resolution_y = 640, 520

def aim(loc, target=(0, 0.1, 0.55)):
    cam.location = loc
    d = [target[i] - loc[i] for i in range(3)]
    cam.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)

for view, loc in (("front", (1.25, -2.0, 1.25)), ("side", (2.6, -0.25, 0.75))):
    aim(loc)
    for f in (1, 14, 24):
        scene.frame_set(f)
        scene.render.filepath = os.path.join(out_dir, f"preview_{view}_{f:02d}.png")
        bpy.ops.render.render(write_still=True)
print("DONE")
