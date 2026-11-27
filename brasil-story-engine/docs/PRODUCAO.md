# As 10 fases de produção (executar nesta ordem)

| fase | entrada | ação | saída / comando |
|---|---|---|---|
| 1. IDEIA | frase do usuário | expandir premissa; avaliar curiosidade, thumbnail, título, storytelling, originalidade, viabilidade de animação (nota 1–5 cada); escolher protagonista e tom | `episodes/<ep>/meta.json` (título + alternativas) — `npm run new-episode -- <slug> "<título>"` |
| 2. ROTEIRO | premissa | pesquisar fatos (fontes oficiais); escrever roteiro completo em atos (ver ESTILO.md); dividir em cenas e falas; estimar tempos (~2,6 palavras/s) | `script.json` |
| 3. PERSONAGENS | roteiro | reutilizar elenco; criar novos só se necessário (em `cast.ts`); conferir na `CharacterSheet` | still da ficha |
| 4. CENÁRIOS | roteiro | reutilizar cenários; criar novos componentes se preciso; conferir na `SceneGallery` | stills |
| 5. STORYBOARD | áudio + cenas | `npm run audio` (timeline real) → escrever `shots.tsx` com composição/posições → `npm run storyboard`; **olhar a prancha**; corrigir composição antes de seguir | `storyboards/<ep>/storyboard.jpg` |
| 6. ANIMAÇÃO | storyboard aprovado | refinar movimento: caminhadas, gestos, expressões nas palavras-chave, câmera, objetos, transições; `--draft` para testar | `npm run render -- <ep> --draft` |
| 7. ÁUDIO | animação | ajustar efeitos (`sfx`), ambientes, climas de música; voz do usuário em `audio_in/` se houver; regenerar | `npm run audio -- <ep>` |
| 8. RENDER | tudo | 1920×1080 · 30 fps · H.264 · AAC estéreo | `npm run render -- <ep>` |
| 9. REVISÃO | vídeo | `python3 scripts/review.py <ep>` + checklist visual (amostrar 1 frame a cada ~5 s); corrigir e renderizar de novo | `out/<ep>/review.md` |
| 10. ENTREGA | aprovado | vídeo, roteiro, thumbnail, título, descrição, legendas, arquivos do projeto | `npm run deliver -- <ep>` |

Atalho para tudo após o roteiro e as cenas: `npm run make -- <ep>`.

## Regras de qualidade

- Nenhuma cena parada: sempre algo se move (personagem, câmera lenta, objeto, luz). A revisão detecta imagem congelada > 2,5 s.
- Cortes motivados pela narrativa (troca de lugar, ação ou informação nova), nunca aleatórios.
- Expressão muda **na palavra** que a motiva (use `useLine` + offset).
- Pés no chão: personagens em pé usam a constante de chão do cenário.
- Voz sempre ≥ 8 dB acima de música/efeitos (a revisão mede).
- Fatos com fonte no `meta.json → sources`.

## Tempo de render (referência)

2 núcleos: ~1 min de vídeo ≈ 6–10 min de render. 8 núcleos: ~2–3 min. Use `--draft` durante o desenvolvimento.
