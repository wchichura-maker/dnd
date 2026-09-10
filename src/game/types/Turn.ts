export type ActionResources = {
  /**
   * Ação padrão.
   *
   * Mantemos o nome "action" temporariamente
   * para preservar compatibilidade com a interface atual.
   */
  action: boolean;

  /**
   * Ação de movimento.
   */
  moveAction: boolean;

  /**
   * Ações livres estão disponíveis independentemente
   * das ações padrão/movimento.
   *
   * O limite real de ações livres será tratado
   * pelas regras específicas de cada ação.
   */
  freeActions: boolean;

  /**
   * Indica se o personagem ainda pode realizar
   * um passo de ajuste de 1,5 m.
   */
  fiveFootStepAvailable: boolean;

  /**
   * Indica se o personagem já realizou movimento
   * durante a rodada.
   *
   * É utilizado para controlar o passo de ajuste.
   */
  hasMoved: boolean;

  /**
   * Distância de movimento ainda disponível
   * na ação de movimento atual.
   */
  movement: number;
};

export type Turn = {
  characterId: string;
  resources: ActionResources;
};