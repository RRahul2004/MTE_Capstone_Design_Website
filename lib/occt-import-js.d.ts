declare module "occt-import-js" {
  type OcctFactory = (options?: { locateFile?: (file: string) => string }) => Promise<any>;
  const factory: OcctFactory;
  export default factory;
}
