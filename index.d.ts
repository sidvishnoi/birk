export type Options = {
  fileName: string;
  baseDir: string;
  includesDir: string;
  compileDebug: boolean;
  inlineRuntime: boolean;
  raw: boolean;
  filters: { [name: string]: (args: any[]) => any };
  tags: { [name: string]: (state: State, token: TagToken) => void };
  _fileMap?: Map<string, string>;
  _generator?: (code: string, inlineRuntime: boolean) => Executable;
  _runtime?: Runtime;
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

/**
 * @param {string} str template string (pre-processed)
 * @param {Options} options
 */
export function compileString(str: string, options: Options);

/**
 * @param str template string (pre-processed)
 * @param options
 */
export async function compileStringAsync(str: string, options: Options);

/**
 * @param options
 */
export async function compileFile(options: Options);

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