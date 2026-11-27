# Referência da Engine

Tudo é **função do frame**. Nunca use `Math.random()`, `Date` ou estado: use `noise()`, `rand()`, `seedOf()` de `src/core/anim.ts`.
Coordenadas: mundo em pixels (1920×1080 por tela; cenários podem ser mais largos). Origem do personagem = **entre os pés, no chão**.

---

## 1. Roteiro de dados — `episodes/<ep>/script.json`

```jsonc
{
  "id": "slug", "title": "E se…?",
  "defaults": { "pause": 0.2, "shotPadStart": 0.2, "shotPadEnd": 0.35 },
  "tail": 1.0,                      // segundos extras no fim
  "shots": [{
    "id": "s01",                     // = chave em SHOTS de shots.tsx
    "beat": "HOOK",                  // HOOK | PREMISSA | PRIMEIRA FASE | ESCALADA | CONSEQUÊNCIA | PROBLEMA CENTRAL | CLÍMAX | CONCLUSÃO | ÚLTIMA SURPRESA
    "scene": "bedroom",              // documentação (storyboard)
    "transition": "cut",             // cut | fade | whip | wipe | iris | flash | dip | zoom (entrada desta cena)
    "ambience": "birds",             // room | birds | street | city | bakery | beach | null
    "music": "mystery",              // inicia um clima que segue até a próxima cena que definir outro (ver §7)
    "padStart": 0.5, "padEnd": 0.4, "minDuration": 2, "duration": 6,   // opcionais
    "lines": [
      { "id": "l01", "speaker": "narrador", "text": "Você acorda…", "pauseAfter": 0.3, "delay": 0,
        "tts": "texto alternativo só para a voz (pronúncia)" }
    ],
    "sfx": [ { "name": "phone_buzz", "at": "l01+1.2", "gain": -3, "pan": 0.4, "args": { "d": 2 } } ]
  }]
}
```

`at` aceita: segundos desde o início da cena (`1.5`), início de fala (`"l03"`, `"l03+0.4"`, `"l03-1"`), fim de fala (`"l03.end-0.2"`), fim da cena (`"end-0.3"`).
A **duração de cada cena vem da voz real**: mudou o texto → `npm run audio` → a animação se reajusta sozinha.

## 2. Cenas — `episodes/<ep>/shots.tsx`

```tsx
const S03: ShotComponent = ({ frame: f, dur }) => {
  const l05 = useLine("l05");               // { start, end, mid } em frames LOCAIS da cena
  const w = walkBetween(f, 0, l05.end, 400, 1200);
  return (
    <Camera frame={f} keys={[{ f: 0, ...shotAt.wide() }, { f: l05.mid, ...shotAt.medium(w.x, S.STREET_WALK), ease: "inOut" }]}
            shakes={[{ at: l05.end, amp: 18 }]}>
      <S.Street frame={f} time="sunset" gateOpen={prog(f, 0, 20)}>
        <Character def={CAST.voce} frame={f} x={w.x} y={S.STREET_WALK} walk={w}
                   pose={poseTrack(f, [[0, "idle"], [l05.mid, "point"]])}
                   expr={exprTrack(f, [[0, "neutral"], [l05.start + 10, "shocked"]])}
                   gaze={[0.8, 0]} talking={useSpeaking("voce", f)} holdF={<Phone />} />
      </S.Street>
      <ScreenLayer>{/* HUD fixo na tela */}</ScreenLayer>
    </Camera>
  );
};
export const SHOTS = { s01: S01, s03: S03 };
```

## 3. Animação (`src/core/anim.ts`)

| função | uso |
|---|---|
| `sec(s)` | segundos → frames |
| `prog(f, f0, f1, ease)` | 0..1 com easing (`linear in out inOut back backOut elastic bounce snap`) |
| `track(f, [[f, v, ease?], …])` | keyframes numéricos |
| `springAt(f, start, {stiffness, damping})` | mola analítica com overshoot |
| `pop(f, start)` | escala 0→1 elástica (entradas de objetos) |
| `noise(x, seed)` / `rand(i, seed)` | variação determinística |
| `blinkAt(f, seed)` | piscar natural (já embutido no rig) |

## 4. Personagens

`<Character def frame x y scale facing view pose expr gaze talking walk wave holdF holdB lift opacity still shadow />`

- **def**: ficha de `CAST` (`voce`, `bia`, `neide`, `valdir`, `theo`, `joao`, `rafa`) ou `extra(i)` para figurantes determinísticos.
- **facing** `1 | -1` (direita/esquerda) · **view** `"3q" | "front"`.
- **pose**: nome, objeto `Pose`, ou `{ base: "point", armF: [80, 10] }`. Trilhas: `poseTrack(f, [[frame, pose], …], blend)`.
  Poses: `idle relaxed point pointUp pointSelf armsUp cheer shrug think facepalm holdPhone phoneUp holdFront carry crossArms wave shocked panic sad sit sitLean crouch jump lieBack sleep fall lean bow`.
  Ângulos: 0 = membro para baixo; positivo = gira para a frente. `armF/armB: [ombro, cotovelo]`, `legF/legB: [quadril, joelho]`.
  Mãos: `open fist point hold thumb` (`hold` desenha `holdF/holdB` na palma, sempre em pé).
- **expr**: `neutral calm happy ecstatic joy shocked surprised worried angry sad smug sleepy confused scared determined greedy` ou objeto/`{base, …}`. Trilha: `exprTrack`.
- **gaze** `[x, y]` −1..1 · **talking** mexe a boca (use `useSpeaking(speaker, f)`) · **wave** 0..1 abana a mão.
- **walk**: `walkBetween(f, f0, f1, x0, x1, {run, stride})` → `{x, phase, amount, run, facing}` (sem patinar; pés colam no chão).
- **jumpAt(f, f0, altura, dur)** → `{ y, squash }` → `lift={j.y}` e `pose={{…, squash: j.squash}}`.
- Automático: respiração, balanço idle, piscar, contato com o chão, sombra, sombreamento de volume.
- Sentar: pose `sit`/`sitLean` e ajuste `y` até o quadril encostar no assento (ver S06 do piloto).
- **Personagem novo**: adicione em `src/characters/cast.ts` (pele, cabelo `curly|short|bun|long|bald|afro|ponytail`, camisa `tee|polo|blouse|tank|jacket`, calça `jeans|shorts|skirt`, acessórios `glasses cap mustache beard earrings apron necklace`, `build {height,width,head}`). Nunca altere um existente.

## 5. Câmera

`<Camera frame keys shakes handheld state>` · keys `{ f, x, y, zoom, rot, ease }` (x,y = ponto do mundo no centro da tela).
Atalhos: `shotAt.wide()`, `shotAt.medium(x, feetY)`, `shotAt.close(x, feetY)`, `shotAt.detail(x, y)`.
Camadas: `<Layer depth>` (0 = céu infinito, 1 = plano dos personagens, >1 = primeiro plano) · `<ScreenLayer>` fixo na tela.

## 6. Cenários (`src/scenes`)

| componente | chão (pés) | props principais |
|---|---|---|
| `Bedroom` | `BEDROOM_FLOOR` (900) | `time lampOn blanketFold onNightstand fg` |
| `Street` (−400…4400 px) | `STREET_WALK` (940) | `time gateOpen garageOpen cars back fg bakeryName` · pontos: `STREET_SPOTS` (portões, ponto de ônibus, padaria) |
| `Bakery` | `BAKERY_FLOOR` (940) | `prices behind onCounter breadCount` · `BAKERY_COUNTER` |
| `City` | `CITY_GROUND` (900) | `time traffic sky` |
| `Kitchen` | `KITCHEN_FLOOR` (920) | `fridgeOpen` |
| `Beach` | `BEACH_SAND` (900) | — |
| `Classroom` | `CLASSROOM_FLOOR` (930) | `board: string[]` |
| `GraphicBg` | — | fundo para explicações/números |

`time`: `morning | day | sunset | night` (céu + correção de cor). Peças: `Sky Sun Cloud(s) Tree Palm PowerPole LightBeam Grade House BakeryFront BusStop`.
**Cenário novo**: copie o padrão (Layer <1 parede/céu → Layer 1 chão+objetos+`children` → Layer >1 `fg` → `Grade`), exporte a linha do chão e registre em `src/scenes/index.ts` e na `SceneGallery`.

## 7. Props e UI

Props: `Phone(screen glow buzz)`, `BankNotif`, `Bread`, `BreadBag`, `Bill`, `MoneyStack`, `MoneyRain`, `PriceTag(price swing color)`, `Box3D`, `Bed`, `Nightstand`, `Chair`, `Car(color wheelRot flip)`, `Bus`, `Mug`, `Plant`.
UI: `NotifBubble`, `PhoneScreen(balance notifAt highlight)`, `Counter(fmt)`, `Stamp`, `CompareBar`, `SpeechBubble`, `ImpactLines`, `Confetti`, `brl(v)`.

## 8. Áudio

- **SFX** (`python3 scripts/audio/sfx.py --list`): `whoosh whoosh_down swish pop click tick ding notification phone_buzz kaching coin footsteps gate door boing impact boom riser slide_up slide_down sparkle record_scratch car_pass car_horn bus_brake crowd cheer gasp_crowd`. Para um novo: função numpy em `sfx.py` + entrada em `SFX`.
- **Música** (`scripts/audio/music.py`): `curious` (bossa), `happy` (samba leve), `tense`, `mystery`, `chaos` (baião), `sad`, `outro`. Clima novo = entrada em `MOODS`.
- **Mix**: voz normalizada (−18 dBFS RMS), música −15 dB com ducking −11 dB sob a voz, ambiente −24 dB, SFX −9 dB, master −14 LUFS.
- **Vozes**: `config/voices.json`. Kokoro pt-BR: `pf_dora`, `pm_alex`, `pm_santa`, misturáveis (`"pm_alex*0.7+pm_santa*0.3"`) + `pitch` (semitons) + `speed`.
- Números/moeda são convertidos para palavras automaticamente (`R$ 0,80` → "oitenta centavos"). Para pronúncia especial use `"tts"` na fala.

## 9. Ferramentas de inspeção

- `npm run studio` → `CharacterSheet` (elenco, poses, expressões) e `SceneGallery` (todos os cenários).
- `node scripts/stills.mjs <Composition> <pasta> '<json>'` → stills avulsos.
- `npm run storyboard -- <ep> --shots s03,s07 --per 4` → só algumas cenas.
