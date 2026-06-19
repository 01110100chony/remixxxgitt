# Plano

## Problema

Na aba **Orientações**, o banner decide se houve XML usando apenas:

```ts
const hasAnyXml = breakdown.lattes > 0;
```

Ou seja: ele considera “XML importado” somente se existir pelo menos uma **orientação** com `source_origin = 'lattes'`.

Isso falha quando:
- o XML foi processado, mas não trouxe orientações daquela categoria;
- as orientações foram filtradas/desativadas;
- o docente tem `lattes_xml_path` + `last_processed_at`, mas a aba específica está vazia;
- dados antigos ainda estão com `source_origin = 'manual'`.

Resultado: a aba mostra “Currículo Lattes não importado” mesmo depois da ingestão.

## Correção

### 1. Ajustar `OrientationsDbTab.tsx`

Trocar a detecção local:

```ts
const hasAnyXml = breakdown.lattes > 0;
```

por uma regra baseada nos docentes:

```ts
const hasAnyProcessedXml = researchers.some(
  (r) => !!r.lattes_xml_path && !!r.last_processed_at
);

const hasAnyXml = hasAnyProcessedXml || breakdown.lattes > 0;
```

Assim, se o docente teve XML processado, a aba reconhece o Lattes mesmo que não existam orientações lidas do XML.

### 2. Melhorar a mensagem do `DataSourceBanner`

Quando `totalRows === 0` e `hasAnyXml === true`, manter a mensagem correta:

> “O XML foi processado, mas não há orientações desta categoria. Você pode complementar manualmente.”

Ou seja, não mostrar “Currículo Lattes não importado”.

### 3. Aplicar a mesma lógica nas outras abas que usam `DataSourceBanner`

Para evitar o mesmo bug em outras telas, aplicar a mesma regra em:

- `ArticlesTab.tsx`
- `ProjectsDbTab.tsx`
- `TechnicalProductionsTab.tsx`
- `ReviewerTab.tsx`
- `OrientationsDbTab.tsx`

Sempre que a aba recebe `researchers`, usar o status real do docente como fonte principal.

### 4. Preservar a lógica de origem das linhas

Não vou alterar `source_origin` nem dados do banco nesta correção. O filtro e os badges de origem continuam mostrando a origem real das linhas.

## Resultado esperado

Depois da correção:

- XML processado + zero orientações → mostra “XML processado, sem orientações nesta categoria”.
- XML processado + orientações XML → mostra “Dados sincronizados com Lattes”.
- Sem XML processado + zero orientações → mostra “Currículo Lattes não importado”.
- A contagem/status do docente fica consistente com `lattes_xml_path` + `last_processed_at`.