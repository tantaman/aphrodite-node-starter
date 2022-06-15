import {
  context,
  anonymous,
  basicResolver,
  sql,
  commit,
  Context,
  P,
} from "@aphro/runtime-ts";
import connect, { DatabaseConnection } from "@databases/sqlite";
import TodoListMutations from "./generated/TodoListMutations.js";
import TodoMutations from "./generated/TodoMutations.js";
import { fileURLToPath } from "url";
import path from "path";
import { readdirSync } from "fs";
import TodoList from "./generated/TodoList.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // not prividing a file name uses an in-memory db
  // providing a file name to connect will save changes to disk.
  const db = connect();
  await createTables(db);
  const ctx = context(anonymous(), basicResolver(db));

  await createTestData(ctx);
  await runSomeQueries(ctx);
}

async function createTestData(ctx: Context) {
  let lists = await TodoList.queryAll(ctx).gen();

  if (lists.length !== 0) {
    return;
  }

  const listCs = TodoListMutations.create(ctx, {
    name: "Bucket List",
  }).toChangeset();

  // Create all items in the same write.
  const [storageHandle] = commit(
    ctx,
    listCs,
    TodoMutations.create(ctx, {
      list: listCs,
      text: "Read",
    }).toChangeset(),
    TodoMutations.create(ctx, {
      list: listCs,
      text: "Write",
    }).toChangeset(),
    TodoMutations.create(ctx, {
      list: listCs,
      text: "Code",
    }).toChangeset(),
    TodoMutations.create(ctx, {
      list: listCs,
      text: "Sleep",
    }).toChangeset(),
    TodoMutations.create(ctx, {
      list: listCs,
      text: "Eat",
    }).toChangeset(),
    TodoMutations.create(ctx, {
      list: listCs,
      text: "Drink",
    }).toChangeset()
  );

  await storageHandle;
}

async function runSomeQueries(ctx: Context) {
  const todos = await TodoList.queryAll(ctx)
    .whereName(P.equals("Bucket List"))
    .queryTodos()
    .gen();
  console.log(todos.map((t) => t.text));
}

async function createTables(db: DatabaseConnection) {
  const generatedDir = path.join(__dirname, "..", "src", "generated");
  const schemaPaths = readdirSync(generatedDir).filter((name) =>
    name.endsWith(".sqlite.sql")
  );

  const schemas = schemaPaths.map((s) => sql.file(path.join(generatedDir, s)));

  await Promise.all(schemas.map((s) => db.query(s)));
}

await main();
