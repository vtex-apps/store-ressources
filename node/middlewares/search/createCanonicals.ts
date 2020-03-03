import { zip } from 'ramda'

import { Catalog } from '../../clients/catalog'
import { ColossusEventContext } from '../../typings/Colossus'

const enrichSegmentName = async (
  catalog: Catalog,
  segment: string,
  mapValue: string
) => {
  const [fieldName, fieldValue] = mapValue.split('_')
  if (fieldName === 'specificationFilter' && !isNaN(Number(fieldValue))) {
    const { Name: specificationFilterName } = await catalog.getField(
      Number(fieldValue)
    )
    return `${specificationFilterName.toLowerCase()}_${segment}`
  }

  return segment.toLowerCase()
}

export async function createCanonicals(
  ctx: ColossusEventContext,
  next: () => Promise<void>
) {
  const {
    clients: { catalog: catalog },
    state: { searchURLs },
  } = ctx

  for (const searchURL of searchURLs) {
    const { path } = searchURL
    const [segments, queryMap] = path.split('?map=')
    const pathSegments = segments.slice(1).split('/')
    const mapSegments = queryMap.split(',')
    const zippedSegments = zip(pathSegments, mapSegments)
    const enrichedPathSegments: string[] = []

    for (const [segment, mapValue] of zippedSegments) {
      enrichedPathSegments.push(
        await enrichSegmentName(catalog, segment, mapValue)
      )
    }

    searchURL.canonicalPath = `/${enrichedPathSegments.join('/')}`
      .replace(/\s/g, '-')
  }

  await next()
}
