# Bíblia de estilo — "Bairro"

## Identidade visual (original)

- **Traço**: contorno ameixa-escuro `#2b2233` (nunca preto puro), 5 px nos personagens, 4–6 px nos objetos. Cantos arredondados, juntas redondas.
- **Proporção**: cabeça grande (~40% da altura), corpo simples, membros como "tubos" de 2 segmentos, mãos redondas, tênis arredondados.
- **Rosto**: olhos brancos grandes com pupila e brilho; sobrancelhas grossas fazem a maior parte da atuação; boca desenhada por parâmetros (largura, abertura, curva, dentes, língua). 3/4 por padrão, de frente para momentos "olhando pra câmera".
- **Volume**: cada peça tem um lado de sombra (lado de trás mais escuro), luz de topo na cabeça, sombra de contato no chão. Membros de trás 15% mais escuros.
- **Paleta**: quente e levemente dessaturada (`src/core/color.ts → PAL`). Laranja-queimado do protagonista, verde-água, mostarda, lilás. Dinheiro = verde próprio (não reproduz cédulas reais).
- **Cenários**: vetoriais em camadas com parallax; detalhes brasileiros reais e cotidianos (caixa d'água azul, telha colonial, muro com portão basculante, fiação embolada, azulejo de padaria, filtro de barro, ventilador). Sem caricatura (nada de bandeira/carnaval/futebol gratuito).
- **Luz**: `time` do cenário + `Grade` (tinta multiplicada + vinheta). Manhã quente, dia neutro, pôr do sol laranja-lilás, noite azul.
- **Tipografia**: Fredoka (títulos, carimbos), Nunito (UI). Texto na tela só para números, palavras-chave e interfaces.
- **Marcas/IP**: nunca use logos, personagens ou marcas reais. Bancos, lojas e apps são fictícios ("Banco Bairro", "Padaria Estrela").

## Elenco fixo

| id | nome | papel |
|---|---|---|
| `voce` | Você (Davi) | protagonista padrão da 2ª pessoa |
| `bia` | Bia | protagonista alternativa / amiga |
| `neide` | Dona Neide | vizinha que sabe de tudo |
| `valdir` | Seu Valdir | dono da padaria / comerciante |
| `theo` | Théo | criança |
| `joao` | Seu João | idoso / bisavô |
| `rafa` | Rafa | figurante versátil (motorista, repórter, colega) |

Alterne o protagonista entre episódios quando fizer sentido (`bia` em metade dos temas, por ex.).

## Escrita (português brasileiro natural)

- **2ª pessoa**, presente, frases curtas: "Você acorda…", "Na primeira hora…", "Mas três dias depois…".
- Soa como alguém **contando** uma história para um amigo, não lendo um artigo. Use "pra", "tá", "aí" com moderação e só quando combina.
- **Nunca** abra com "Olá pessoal". Abra no meio da ação / na consequência mais estranha.
- Cada bloco precisa de: uma informação nova **ou** uma escalada **ou** uma piada. Se não tem nenhum, corte.
- Humor por **observação** e **contraste** (o detalhe banal no meio do absurdo: o pão de R$ 900), não por exagero de sotaque ou estereótipo.
- Fatos e números: pesquise, use fonte oficial, arredonde de forma honesta ("quase 17 vezes"), coloque as fontes no `meta.json`.
- Proibido: "Neste vídeo vamos explorar", "mergulhar", "é importante ressaltar", "em suma", "no mundo de hoje", listas de três adjetivos, perguntas retóricas em série, repetir a mesma estrutura de frase em sequência.
- Falas de personagem: curtas, com voz própria (Dona Neide fala "meu filho", Seu Valdir chama todo mundo de "chefe").
- Termine com **ironia ou virada** que nasce da própria premissa. Sem "continua no próximo episódio" sem motivo.

## Estrutura de um episódio

| ato | % do tempo (8–15 min) | o que acontece |
|---|---|---|
| A. Hook | 0–5% | consequência intrigante, sem explicação |
| B. Premissa | 5–10% | o que mudou + as regras |
| C. Primeira fase | 10–25% | protagonista experimenta a novidade (lado bom) |
| D. Escalada | 25–45% | cada evento maior que o anterior |
| E. Consequências inesperadas | 45–60% | efeitos não óbvios (com fatos) |
| F. Problema central | 60–75% | conflito real ameaça protagonista/mundo |
| G. Clímax | 75–88% | maior consequência da premissa |
| H. Conclusão | 88–96% | resolução satisfatória |
| I. Última surpresa | 96–100% | ironia / virada final |

Ritmo de cortes: uma cena nova quando muda o lugar, a ação ou entra informação nova. Em média 4–8 s por cena, nunca > 12 s sem mudança de câmera ou ação. Para 10 min: ~90–130 cenas, ~1.500–1.700 palavras de narração.
