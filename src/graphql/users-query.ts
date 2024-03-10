import { DocumentNode, gql } from '@apollo/client/core';

export function getUsersQuery(): DocumentNode {
  return gql`
      query getUsersQuery($skip: Int) {
          userEntities(
              where: {
                  id_not: "0x0000000000000000000000000000000000000000"
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