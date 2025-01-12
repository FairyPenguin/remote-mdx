import { jsxRuntime } from './jsx-runtime'
import { serialize } from './serialize'
import type { ElementType } from 'react'
import type { MDXRemoteRSCProps, CompileMDXResult } from './types'

export async function compileMDX<TFrontmatter = Record<string, unknown>>({
  source,
  options,
  components = {},
}: MDXRemoteRSCProps): Promise<CompileMDXResult<TFrontmatter>> {
  const { compiledSource, frontmatter, scope } = await serialize<
    Record<string, unknown>,
    TFrontmatter
  >(
    source,
    options,
    // Enable RSC importSource
    true
  )
  // if we're ready to render, we can assemble the component tree and let React do its thing
  // first we set up the scope which has to include the mdx custom
  // create element function as well as any components we're using
  const fullScope = Object.assign(
    {
      opts: jsxRuntime,
    },
    { frontmatter },
    scope
  )
  const keys = Object.keys(fullScope)
  const values = Object.values(fullScope)

  // now we eval the source code using a function constructor
  // in order for this to work we need to have React, the mdx createElement,
  // and all our components in scope for the function, which is the case here
  // we pass the names (via keys) in as the function's args, and execute the
  // function with the actual values.
  const hydrateFn = Reflect.construct(
    Function,
    keys.concat(`${compiledSource}`)
  )

  const Content: ElementType = hydrateFn.apply(hydrateFn, values).default

  return {
    content: <Content components={components} />,
    frontmatter,
  }
}

/**
 * Renders compiled source from serialize.
 */
export async function MDXRemote(props: MDXRemoteRSCProps) {
  return (await compileMDX(props)).content
}

export type {
  MDXRemoteSerializeResult,
  CompileMDXResult,
  MDXRemoteRSCProps as MDXRemoteProps,
  SerializeOptions,
} from './types'
