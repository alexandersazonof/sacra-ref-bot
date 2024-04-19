import { DocumentNode, gql } from '@apollo/client/core';

export function getUsersQuery(): DocumentNode {
  return gql`
      query getUsersQuery($skip: Int) {
          userEntities(
              where: {
                  heroes_: {
                      refCode_not: null
                  }
              }
              skip: $skip
              first: 1000) {
              id
              heroes {
                  refCode
              }
          }
      }
  `;
}