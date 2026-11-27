# Brasil Story Engine 🇧🇷🎬

Engine de **vídeos narrativos animados 100% por código** (estilo "E se…?") para YouTube, em português brasileiro.
Personagens com rig programado, cenários brasileiros vetoriais, câmera com parallax, narração por TTS (ou sua voz), efeitos sonoros e trilha **sintetizados**, storyboard automático, render determinístico em 1080p30.

> Mesmo código + mesmos arquivos = mesmo vídeo. Nenhuma IA é chamada durante o render.

## Instalação (uma vez)

Requisitos: **Node 18+**, **Python 3.10+**, **FFmpeg**, Google Chrome (ou deixe o Remotion baixar o dele).

```bash
bash scripts/setup.sh        # npm install + libs Python + modelos de voz Kokoro (~350 MB)
```

## Fazer um vídeo

```bash
npm run make -- um-milhao    # áudio → storyboard → render → revisão → entrega
```

Resultado em `out/um-milhao/`: `um-milhao.mp4`, `thumbnail.png`, `um-milhao.pt-BR.srt`, `roteiro.md`, `youtube.txt` (título, descrição, tags), `review.md`.

### Passo a passo (o que a skill faz por você)

```bash
npm run new-episode -- meu-tema "E se a Terra parasse de girar?"
# edite episodes/meu-tema/script.json   (roteiro, falas, efeitos, música)
npm run audio -- meu-tema               # vozes + timeline + mix
# edite episodes/meu-tema/shots.tsx     (animação de cada cena)
npm run storyboard -- meu-tema          # prancha em storyboards/meu-tema/storyboard.jpg
npm run render -- meu-tema --draft      # rascunho rápido em 960x540
npm run render -- meu-tema              # final 1920x1080
python3 scripts/review.py meu-tema      # revisão automática
npm run deliver -- meu-tema
```

`npm run studio` abre o Remotion Studio para ver/ajustar ao vivo (inclui `CharacterSheet` e `SceneGallery`).

## Áudio: sua voz ou TTS

Se você **não enviar áudio**, a engine gera tudo: narração, vozes de cada personagem, efeitos, ambiente e música.
Para usar sua voz, coloque em `episodes/<ep>/audio_in/`:

| arquivo | efeito |
|---|---|
| `narration.wav` (ou .mp3/.m4a) | um arquivo com a narração inteira → cortado por silêncio e distribuído pelas falas |
| `l03.wav` | substitui só a fala `l03` (o resto continua TTS) |

Vozes por personagem: `config/voices.json` (Kokoro local por padrão; ElevenLabs/OpenAI/Azure se houver chave em variável de ambiente).

## Estrutura

```
src/
  core/        anim.ts (easing, mola, ruído, piscar) · timeline.tsx (sincronia com a voz) · color.ts
  camera/      Camera.tsx (keyframes, zoom, shake, câmera na mão, parallax por camadas)
  characters/  Character.tsx (rig) · library.ts (poses, expressões, andar, pular) · cast.ts (elenco fixo)
  scenes/      Quarto, Rua, Padaria, Cidade, Cozinha, Praia, Sala de aula, fundo gráfico
  props/       celular, pão, dinheiro, cama, cadeira, carro, ônibus, etiqueta de preço…
  ui/          notificação, tela de banco, contador, carimbo, barras, balão, confete
  fx/          transições (whip, wipe, iris, flash, dip, zoom, fade)
  episode/     EpisodeVideo (monta cenas + transições + áudio)
episodes/<ep>/ script.json · shots.tsx · index.tsx · meta.json · generated/ · audio_in/
scripts/       audio/ (tts, sfx, music, build_audio, align) · storyboard · render · review · deliver · make
config/        voices.json
docs/          ENGINE.md (API) · ESTILO.md (identidade + escrita) · PRODUCAO.md (as 10 fases)
```

Leia `docs/ENGINE.md` antes de escrever cenas.
