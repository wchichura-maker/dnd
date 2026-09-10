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
   * Indica explicitamente se o passo de ajuste
   * já foi utilizado neste turno.
   */
  hasTakenFiveFootStep: boolean;

  /**
   * Distância de movimento ainda disponível
   * na ação de movimento atual.
   */
  movement: number;

  /**
   * D&D 3.5: personagem disabled pode realizar
   * somente uma ação de movimento OU uma ação padrão
   * no turno, e se move à metade da velocidade.
   */
  disabled: boolean;
};

export type Turn = {
  characterId: string;
  resources: ActionResources;
};