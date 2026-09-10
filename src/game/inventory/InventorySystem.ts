import type { Combatant } from "../entities/Combatant";
import type { Item } from "../entities/Item";

import {
  getWeapon,
  getArmor,
  getShield
} from "../entities/EquipmentCatalog";

export type InventoryResult = {
  success: boolean;
  message: string;
  combatant: Combatant;
};

export function addItem(
  combatant: Combatant,
  item: Item
): InventoryResult {
  const items = [
    ...combatant.dnd.inventory.items
  ];

  const existingItem =
    items.find(
      existing =>
        existing.templateId ===
          item.templateId &&
        existing.type ===
          item.type
    );

  if (existingItem) {
    existingItem.quantity +=
      item.quantity;
  } else {
    items.push({
      ...item
    });
  }

  return {
    success: true,

    message:
      `${item.name} foi adicionado ao inventário.`,

    combatant: {
      ...combatant,

      dnd: {
        ...combatant.dnd,

        inventory: {
          items
        }
      }
    }
  };
}

export function removeItem(
  combatant: Combatant,
  itemId: string,
  quantity: number = 1
): InventoryResult {
  const items =
    combatant.dnd.inventory.items
      .map(item => ({
        ...item
      }));

  const item =
    items.find(
      current =>
        current.id === itemId
    );

  if (!item) {
    return {
      success: false,

      message:
        "Item não encontrado no inventário.",

      combatant
    };
  }

  if (
    quantity <= 0
  ) {
    return {
      success: false,

      message:
        "Quantidade inválida.",

      combatant
    };
  }

  if (
    item.quantity <
    quantity
  ) {
    return {
      success: false,

      message:
        "Quantidade insuficiente.",

      combatant
    };
  }

  item.quantity -=
    quantity;

  const remainingItems =
    items.filter(
      current =>
        current.quantity > 0
    );

  return {
    success: true,

    message:
      `${quantity}x ${item.name} removido(s).`,

    combatant: {
      ...combatant,

      dnd: {
        ...combatant.dnd,

        inventory: {
          items:
            remainingItems
        }
      }
    }
  };
}

export function hasItem(
  combatant: Combatant,
  templateId: string,
  quantity: number = 1
): boolean {
  const item =
    combatant.dnd.inventory.items.find(
      current =>
        current.templateId ===
        templateId
    );

  return (
    item !== undefined &&
    item.quantity >= quantity
  );
}

export function equipItem(
  combatant: Combatant,
  itemId: string
): InventoryResult {
  const item =
    combatant.dnd.inventory.items.find(
      current =>
        current.id === itemId
    );

  if (!item) {
    return {
      success: false,

      message:
        "Item não encontrado no inventário.",

      combatant
    };
  }

  if (
    item.quantity < 1
  ) {
    return {
      success: false,

      message:
        "Item indisponível.",

      combatant
    };
  }

  if (
    item.type === "WEAPON"
  ) {
    const weapon =
      getWeapon(
        item.templateId
      );

    if (!weapon) {
      return {
        success: false,

        message:
          "Definição da arma não encontrada.",

        combatant
      };
    }

    return equipWeapon(
      combatant,
      weapon,
      itemId
    );
  }

  if (
    item.type === "ARMOR"
  ) {
    const armor =
      getArmor(
        item.templateId
      );

    if (!armor) {
      return {
        success: false,

        message:
          "Definição da armadura não encontrada.",

        combatant
      };
    }

    return equipArmor(
      combatant,
      armor,
      itemId
    );
  }

  if (
    item.type === "SHIELD"
  ) {
    const shield =
      getShield(
        item.templateId
      );

    if (!shield) {
      return {
        success: false,

        message:
          "Definição do escudo não encontrada.",

        combatant
      };
    }

    return equipShield(
      combatant,
      shield,
      itemId
    );
  }

  return {
    success: false,

    message:
      "Este item não pode ser equipado.",

    combatant
  };
}

function equipWeapon(
  combatant: Combatant,
  weapon: NonNullable<
    Combatant["dnd"]["equipment"]["weapon"]
  >,
  itemId: string
): InventoryResult {
  const oldWeapon =
    combatant.dnd.equipment.weapon;

  let items =
    combatant.dnd.inventory.items
      .filter(
        item =>
          item.id !== itemId
      )
      .map(item => ({
        ...item
      }));

  if (oldWeapon) {
    items.push({
      id:
        `${oldWeapon.id}-${Date.now()}`,

      templateId:
        oldWeapon.id,

      name:
        oldWeapon.name,

      type:
        "WEAPON",

      quantity: 1
    });
  }

  return {
    success: true,

    message:
      `${weapon.name} equipada.`,

    combatant: {
      ...combatant,

      dnd: {
        ...combatant.dnd,

        equipment: {
          ...combatant.dnd.equipment,

          weapon
        },

        inventory: {
          items
        }
      }
    }
  };
}

function equipArmor(
  combatant: Combatant,
  armor: NonNullable<
    Combatant["dnd"]["equipment"]["armor"]
  >,
  itemId: string
): InventoryResult {
  const oldArmor =
    combatant.dnd.equipment.armor;

  let items =
    combatant.dnd.inventory.items
      .filter(
        item =>
          item.id !== itemId
      )
      .map(item => ({
        ...item
      }));

  if (oldArmor) {
    items.push({
      id:
        `${oldArmor.id}-${Date.now()}`,

      templateId:
        oldArmor.id,

      name:
        oldArmor.name,

      type:
        "ARMOR",

      quantity: 1
    });
  }

  return {
    success: true,

    message:
      `${armor.name} equipada.`,

    combatant: {
      ...combatant,

      dnd: {
        ...combatant.dnd,

        equipment: {
          ...combatant.dnd.equipment,

          armor
        },

        inventory: {
          items
        }
      }
    }
  };
}

function equipShield(
  combatant: Combatant,
  shield: NonNullable<
    Combatant["dnd"]["equipment"]["shield"]
  >,
  itemId: string
): InventoryResult {
  const oldShield =
    combatant.dnd.equipment.shield;

  let items =
    combatant.dnd.inventory.items
      .filter(
        item =>
          item.id !== itemId
      )
      .map(item => ({
        ...item
      }));

  if (oldShield) {
    items.push({
      id:
        `${oldShield.id}-${Date.now()}`,

      templateId:
        oldShield.id,

      name:
        oldShield.name,

      type:
        "SHIELD",

      quantity: 1
    });
  }

  return {
    success: true,

    message:
      `${shield.name} equipado.`,

    combatant: {
      ...combatant,

      dnd: {
        ...combatant.dnd,

        equipment: {
          ...combatant.dnd.equipment,

          shield
        },

        inventory: {
          items
        }
      }
    }
  };
}

export function unequipWeapon(
  combatant: Combatant
): InventoryResult {
  const weapon =
    combatant.dnd.equipment.weapon;

  if (!weapon) {
    return {
      success: false,

      message:
        "Nenhuma arma equipada.",

      combatant
    };
  }

  const item: Item = {
    id:
      `${weapon.id}-${Date.now()}`,

    templateId:
      weapon.id,

    name:
      weapon.name,

    type:
      "WEAPON",

    quantity: 1
  };

  const result =
    addItem(
      combatant,
      item
    );

  return {
    success: true,

    message:
      `${weapon.name} desequipada.`,

    combatant: {
      ...result.combatant,

      dnd: {
        ...result.combatant.dnd,

        equipment: {
          ...result.combatant.dnd.equipment,

          weapon:
            undefined
        }
      }
    }
  };
}

export function unequipArmor(
  combatant: Combatant
): InventoryResult {
  const armor =
    combatant.dnd.equipment.armor;

  if (!armor) {
    return {
      success: false,

      message:
        "Nenhuma armadura equipada.",

      combatant
    };
  }

  const item: Item = {
    id:
      `${armor.id}-${Date.now()}`,

    templateId:
      armor.id,

    name:
      armor.name,

    type:
      "ARMOR",

    quantity: 1
  };

  const result =
    addItem(
      combatant,
      item
    );

  return {
    success: true,

    message:
      `${armor.name} desequipada.`,

    combatant: {
      ...result.combatant,

      dnd: {
        ...result.combatant.dnd,

        equipment: {
          ...result.combatant.dnd.equipment,

          armor:
            undefined
        }
      }
    }
  };
}

export function unequipShield(
  combatant: Combatant
): InventoryResult {
  const shield =
    combatant.dnd.equipment.shield;

  if (!shield) {
    return {
      success: false,

      message:
        "Nenhum escudo equipado.",

      combatant
    };
  }

  const item: Item = {
    id:
      `${shield.id}-${Date.now()}`,

    templateId:
      shield.id,

    name:
      shield.name,

    type:
      "SHIELD",

    quantity: 1
  };

  const result =
    addItem(
      combatant,
      item
    );

  return {
    success: true,

    message:
      `${shield.name} desequipado.`,

    combatant: {
      ...result.combatant,

      dnd: {
        ...result.combatant.dnd,

        equipment: {
          ...result.combatant.dnd.equipment,

          shield:
            undefined
        }
      }
    }
  };
}