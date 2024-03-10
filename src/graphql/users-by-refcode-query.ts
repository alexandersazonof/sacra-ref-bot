import { DocumentNode, gql } from '@apollo/client/core';

export function getUserByRefCodeQuery(): DocumentNode {
    return gql`
        query getUserByRefCode($id: String!, $skip: Int) {
            userEntities(where: {heroes_: {refCode: $id}}, first: 1000, skip: $skip) {
                id
                heroes {
                    stats {
                        level
                    }
                }
            }
        }
    `;
}