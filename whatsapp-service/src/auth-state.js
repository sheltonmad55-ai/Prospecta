import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys';
import { db } from './db.js';

/**
 * useDbAuthState(userId)
 * Implementação personalizada de AuthenticationState do Baileys persistida
 * inteiramente na tabela `wa_auth` da base de dados (Supabase/Postgres).
 *
 * Garante que a sessão nunca é perdida quando contentores Docker ou Web Services
 * gratuitos (como Render) reiniciam ou são recriados.
 */
export async function useDbAuthState(userId) {
  // 1. Carregar creds existentes ou inicializar novos
  const rawCreds = await db.getAuthKey(userId, 'creds');
  let creds;

  if (rawCreds) {
    try {
      creds = JSON.parse(rawCreds, BufferJSON.reviver);
    } catch (err) {
      console.warn(`[DbAuthState] Falha ao parsear creds do utilizador ${userId}, reinicializando:`, err.message);
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  // 2. Definir o objeto keys com get e set assíncronos
  const keys = {
    async get(type, ids) {
      const data = {};
      const dbKeys = ids.map((id) => `${type}-${id}`);
      const rawValues = await db.getAuthKeys(userId, dbKeys);

      for (const id of ids) {
        const dbKey = `${type}-${id}`;
        const val = rawValues[dbKey];
        if (val) {
          try {
            let parsed = JSON.parse(val, BufferJSON.reviver);
            if (type === 'app-state-sync-key' && parsed) {
              parsed = proto.Message.AppStateSyncKeyData.fromObject(parsed);
            }
            data[id] = parsed;
          } catch (e) {
            console.warn(`[DbAuthState] Erro ao deserializar chave ${dbKey}:`, e.message);
          }
        }
      }

      return data;
    },

    async set(data) {
      const entriesToSet = [];
      const keysToDelete = [];

      for (const type of Object.keys(data)) {
        for (const id of Object.keys(data[type])) {
          const value = data[type][id];
          const dbKey = `${type}-${id}`;

          if (value) {
            entriesToSet.push({
              key: dbKey,
              value: JSON.stringify(value, BufferJSON.replacer),
            });
          } else {
            keysToDelete.push(dbKey);
          }
        }
      }

      if (entriesToSet.length > 0) {
        await db.setAuthKeys(userId, entriesToSet);
      }
      if (keysToDelete.length > 0) {
        await db.deleteAuthKeys(userId, keysToDelete);
      }
    },
  };

  return {
    state: {
      creds,
      keys,
    },
    saveCreds: async () => {
      await db.setAuthKey(userId, 'creds', JSON.stringify(creds, BufferJSON.replacer));
    },
    clearState: async () => {
      await db.clearUserAuth(userId);
    },
  };
}
