import RouteParser from 'route-parser'
import { Product } from 'vtex.catalog-graphql'
import { InternalInput } from 'vtex.rewriter'

import { ColossusEventContext } from '../../typings/Colossus'
import { PAGE_TYPES, ROUTES_JSON_PATH, STORE_LOCATOR } from './utils'


interface ContentTypeDefinition {
  internal: string
  canonical: string
}

const getProductInternal = (path: string, id: string): InternalInput => ({
  declarer: STORE_LOCATOR,
  from: path,
  id,
  type: PAGE_TYPES.PRODUCT,
  // TODO ????? bindings?: Maybe<Array<Scalars['String']>>,
  // TODO ???? endDate?: Maybe<Scalars['Str/ing']>,
})

const getProductNotFoundInternal = (path: string): InternalInput => ({
  declarer: STORE_LOCATOR,
  from: path,
  id: 'product',
  type: PAGE_TYPES.PRODUCT_NOT_FOUND,
})

export async function saveInternalProductRoute(
  ctx: ColossusEventContext,
  next: () => Promise<any>
) {
  const {
    clients: { apps, rewriterGraphql },
    vtex: { logger },
  } = ctx
  try {
    const product: Product = ctx.body.data
    const slug = product.linkId?.toLowerCase()
    const routesJSON = await apps.getAppJSON(STORE_LOCATOR, ROUTES_JSON_PATH) as Record<string, ContentTypeDefinition>
    const productRoute = routesJSON[PAGE_TYPES.PRODUCT]
    const canonicalParser = new RouteParser(productRoute.canonical)
    const path = canonicalParser.reverse({ slug })

    const internal: InternalInput = product.isActive
      ? getProductInternal(path, product.id)
      : getProductNotFoundInternal(path)

    await rewriterGraphql.saveInternal(internal)
  } catch (error) {
    logger.error(error)
  }

  await next()
}
.
