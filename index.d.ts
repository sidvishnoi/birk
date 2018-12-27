export type Filters = { [name: string]: (args: any[]) => any };

export type Options = {
  fileName: string;
  baseDir: string;
  includesDir: string;
  compileDebug: boolean;
  inlineRuntime: boolean;
  raw: boolean;
  filters: Filters;
  tags: { [name: string]: (state: State, token: TagToken) => void };
  _fileMap?: Map<string, string>;
  _generator?: (code: string, inlineRuntime: boolean) => Executable;
  _runtime?: Runtime;
};

export abstract class BirkError extends Error {
  constructor(message: string, name: string, context?: string);
}

export type Runtime = {
  filters: Filters;
  rethrow: (
    pos: number,
    file: string,
    runtime: Runtime,
    err: Error,
    msg: string,
  ) => void;
  context: (
    pos: number,
    file: string,
    fileMap: Map<string, string>,
    ctx = 2,
  ) => string;
  BirkError: BirkError;
  undef: (value: any, id: string) => string;
};

export type RawToken = {
  type: "raw";
  val: string;
  start: number;
  end: number;
  fpos: number;
};

export type TagToken = {
  type: "tag";
  val: string;
  start: number;
  end: number;
  fpos: number;
  name: string;
  args: string[];
};

export type ObjectToken = {
  type: "object";
  val: string;
  start: number;
  end: number;
  fpos: number;
  name: string;
  filters: Array<{ name: string; args: string[] }>;
};

export type Token = RawToken | TagToken | ObjectToken;

interface Buffer {
  buf: string[];
  add(str: string, quoted = false): void;
  addDebug(state: State): void;
  addPlain(str: string): void;
  toString(): string;
}

export type State = {
  idx: number;
  fpos: number;
  file: string;
  buf: Buffer;
  locals: Set<string>;
  localsFullNames: Set<string>;
  filters: Map<string, [number, string]>;
  context: VariableContext;
  fileMap: Map<string, string>;
  warnings: Array<{ message: string; context: string }>;
  mixins: Map<string, { params: string[]; tokens: Token[] }>;
  blocks: Map<string, { tokens: Token[]; idx: number; file: string }>;
  tokens: Token[];
  conf: Options;
};

type CompilerOutput = {
  code: string;
  fn: Function | undefined;
  locals: Set<string>;
  localsFullNames: Set<string>;
  warnings: Array<{ message: string; context: string }>;
};

/**
 * @param {string} str template string (pre-processed)
 * @param {Options} options
 */
export function compileString(str: string, options: Options): CompilerOutput;

/**
 * @param str template string (pre-processed)
 * @param options
 */
export async function compileStringAsync(
  str: string,
  options: Options,
): Promise<CompilerOutput>;

/**
 * @param options
 */
export async function compileFile(options: Options): Promise<CompilerOutput>;

/**
 * @param str template string (pre-processed)
 * @param locals
 * @param options
 */
export function renderString(str: string, locals: object, options: Options);

/**
 * @param str template string (pre-processed)
 * @param locals
 * @param options
 */
export async function renderStringAsync(
  str: string,
  locals: object,
  options: Options,
);

/**
 * @param locals
 * @param options
 */
export async function renderFile(locals: object, options: Options);

type Birk = {
  compileString: typeof compileString;
  compileStringAsync: typeof compileStringAsync;
  compileFile: typeof compileFile;
  renderString: typeof renderString;
  renderStringAsync: typeof renderStringAsync;
  renderFile: typeof renderFile;
};

export default Birk;
export = Birk;
