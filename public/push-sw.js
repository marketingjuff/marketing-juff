// Recebe os avisos do Marketing Juff mesmo com o sistema em segundo plano.
self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = {};
  }
  const titulo = dados.titulo || "Marketing Juff";
  const opcoes = {
    body: dados.corpo || "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: dados.card_id ? `card-${dados.card_id}` : undefined,
    data: { card_id: dados.card_id || null, quadro_id: dados.quadro_id || null },
  };
  evento.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const d = evento.notification.data || {};
  const destino = d.quadro_id ? `/tarefas/quadros/${d.quadro_id}` : "/tarefas/quadros";
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ("focus" in c) {
          if ("navigate" in c) c.navigate(destino);
          return c.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
