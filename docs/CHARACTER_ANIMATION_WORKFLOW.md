# Character Animation Workflow

## Objetivo

Manter todos os personagens com uma estrutura de animação consistente e versionada no Git.

## Estrutura

Cada personagem usa um único `AnimatedSprite2D` chamado `CharacterSprite` dentro do `EntityView` e um único recurso `SpriteFrames` contendo todas as animações.

```text
EntityView
└── CharacterSprite (AnimatedSprite2D)
    └── SpriteFrames
```

Não criar um `AnimatedSprite2D` separado por estado.

## Estados

Cada personagem deve possuir estes estados:

- `IDLE`
- `WALK`
- `ATTACK`
- `HIT`
- `DEATH`
- `BLOCK`
- `INTERACT`

Cada estado possui 8 direções:

1. `SOUTH`
2. `SOUTHEAST`
3. `EAST`
4. `NORTHEAST`
5. `NORTH`
6. `NORTHWEST`
7. `WEST`
8. `SOUTHWEST`

Formato dos nomes:

```text
<STATE>_SOUTH
<STATE>_SOUTHEAST
<STATE>_EAST
<STATE>_NORTHEAST
<STATE>_NORTH
<STATE>_NORTHWEST
<STATE>_WEST
<STATE>_SOUTHWEST
```

Total: 7 estados × 8 direções = 56 animações por personagem.

## Sprite sheets

Cada sheet deve ter 8 linhas × 6 colunas:

- 8 linhas = direções
- 6 colunas = frames

A ordem das linhas deve ser a mesma ordem das direções acima.

## Configuração

Cada animação usa 6 frames e 8 FPS.

| Estado | Loop |
|---|---|
| IDLE | OFF |
| WALK | ON |
| ATTACK | OFF |
| HIT | OFF |
| DEATH | OFF |
| BLOCK | OFF |
| INTERACT | OFF |

## Procedimento no Godot

1. Abrir `EntityView.tscn`.
2. Selecionar `CharacterSprite`.
3. Usar o mesmo `SpriteFrames` já existente.
4. Criar as 8 animações de cada estado pelo botão `+` do painel **Animações**.
5. Configurar 8 FPS.
6. Para cada direção, usar **Add frames from a Sprite Sheet**.
7. Dividir o sheet em 6 colunas × 8 linhas.
8. Selecionar a linha correspondente à direção.
9. Adicionar os 6 frames.
10. Ajustar Loop conforme a tabela.
11. Não alterar `Scale`, `Position` ou `Filter` do `CharacterSprite` durante a montagem.
12. Testar as 8 direções no editor e depois no jogo.

## Versionamento

Depois de validar o personagem:

1. Adicionar os PNGs dos sprite sheets necessários.
2. Adicionar a cena `EntityView.tscn` modificada.
3. Não adicionar arquivos `.uid`, `.import` ou outros arquivos gerados pelo Godot sem necessidade.
4. Conferir `git status` antes do commit.
5. Fazer commit.
6. Fazer push para `main`.

O `EntityView.tscn` é a fonte oficial da configuração das animações do personagem.

## Regra para novos personagens

O processo acima deve ser repetido para cada personagem. Primeiro os assets, depois as 56 animações no mesmo `SpriteFrames`, depois teste e versionamento antes de iniciar o próximo personagem.