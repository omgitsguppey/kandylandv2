# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAiInteractions*](#listaiinteractions)
- [**Mutations**](#mutations)
  - [*CreateAiInteraction*](#createaiinteraction)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAiInteractions
You can execute the `ListAiInteractions` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAiInteractions(): QueryPromise<ListAiInteractionsData, undefined>;

interface ListAiInteractionsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAiInteractionsData, undefined>;
}
export const listAiInteractionsRef: ListAiInteractionsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAiInteractions(dc: DataConnect): QueryPromise<ListAiInteractionsData, undefined>;

interface ListAiInteractionsRef {
  ...
  (dc: DataConnect): QueryRef<ListAiInteractionsData, undefined>;
}
export const listAiInteractionsRef: ListAiInteractionsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAiInteractionsRef:
```typescript
const name = listAiInteractionsRef.operationName;
console.log(name);
```

### Variables
The `ListAiInteractions` query has no variables.
### Return Type
Recall that executing the `ListAiInteractions` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAiInteractionsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAiInteractionsData {
  aiInteractions: ({
    id: UUIDString;
    modelUsed: string;
    promptContent: string;
    responseContent: string;
    promptTokens?: number | null;
    completionTokens?: number | null;
    latencyMs: number;
    createdAt: DateString;
  } & AiInteraction_Key)[];
}
```
### Using `ListAiInteractions`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAiInteractions } from '@dataconnect/generated';


// Call the `listAiInteractions()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAiInteractions();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAiInteractions(dataConnect);

console.log(data.aiInteractions);

// Or, you can use the `Promise` API.
listAiInteractions().then((response) => {
  const data = response.data;
  console.log(data.aiInteractions);
});
```

### Using `ListAiInteractions`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAiInteractionsRef } from '@dataconnect/generated';


// Call the `listAiInteractionsRef()` function to get a reference to the query.
const ref = listAiInteractionsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAiInteractionsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.aiInteractions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.aiInteractions);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateAiInteraction
You can execute the `CreateAiInteraction` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createAiInteraction(vars: CreateAiInteractionVariables): MutationPromise<CreateAiInteractionData, CreateAiInteractionVariables>;

interface CreateAiInteractionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAiInteractionVariables): MutationRef<CreateAiInteractionData, CreateAiInteractionVariables>;
}
export const createAiInteractionRef: CreateAiInteractionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAiInteraction(dc: DataConnect, vars: CreateAiInteractionVariables): MutationPromise<CreateAiInteractionData, CreateAiInteractionVariables>;

interface CreateAiInteractionRef {
  ...
  (dc: DataConnect, vars: CreateAiInteractionVariables): MutationRef<CreateAiInteractionData, CreateAiInteractionVariables>;
}
export const createAiInteractionRef: CreateAiInteractionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAiInteractionRef:
```typescript
const name = createAiInteractionRef.operationName;
console.log(name);
```

### Variables
The `CreateAiInteraction` mutation requires an argument of type `CreateAiInteractionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAiInteractionVariables {
  modelUsed: string;
  promptContent: string;
  responseContent: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  latencyMs: number;
}
```
### Return Type
Recall that executing the `CreateAiInteraction` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAiInteractionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAiInteractionData {
  aiInteraction_insert: AiInteraction_Key;
}
```
### Using `CreateAiInteraction`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAiInteraction, CreateAiInteractionVariables } from '@dataconnect/generated';

// The `CreateAiInteraction` mutation requires an argument of type `CreateAiInteractionVariables`:
const createAiInteractionVars: CreateAiInteractionVariables = {
  modelUsed: ..., 
  promptContent: ..., 
  responseContent: ..., 
  promptTokens: ..., // optional
  completionTokens: ..., // optional
  latencyMs: ..., 
};

// Call the `createAiInteraction()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAiInteraction(createAiInteractionVars);
// Variables can be defined inline as well.
const { data } = await createAiInteraction({ modelUsed: ..., promptContent: ..., responseContent: ..., promptTokens: ..., completionTokens: ..., latencyMs: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAiInteraction(dataConnect, createAiInteractionVars);

console.log(data.aiInteraction_insert);

// Or, you can use the `Promise` API.
createAiInteraction(createAiInteractionVars).then((response) => {
  const data = response.data;
  console.log(data.aiInteraction_insert);
});
```

### Using `CreateAiInteraction`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAiInteractionRef, CreateAiInteractionVariables } from '@dataconnect/generated';

// The `CreateAiInteraction` mutation requires an argument of type `CreateAiInteractionVariables`:
const createAiInteractionVars: CreateAiInteractionVariables = {
  modelUsed: ..., 
  promptContent: ..., 
  responseContent: ..., 
  promptTokens: ..., // optional
  completionTokens: ..., // optional
  latencyMs: ..., 
};

// Call the `createAiInteractionRef()` function to get a reference to the mutation.
const ref = createAiInteractionRef(createAiInteractionVars);
// Variables can be defined inline as well.
const ref = createAiInteractionRef({ modelUsed: ..., promptContent: ..., responseContent: ..., promptTokens: ..., completionTokens: ..., latencyMs: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAiInteractionRef(dataConnect, createAiInteractionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.aiInteraction_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.aiInteraction_insert);
});
```

