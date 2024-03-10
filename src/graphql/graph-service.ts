import {ApolloClient, createHttpLink, InMemoryCache} from '@apollo/client/core';
import { getUserByRefCodeQuery } from './users-by-refcode-query';
import { UserEntity } from '../../generated/gql';
import { getUsersQuery } from './users-query';

function getSubgraphUrl() {
  return process.env.SUBGRAPH_URL;
}

export function createClient(url: string) {
  return new ApolloClient({
    link: createHttpLink({
      uri: url,
      fetch,
    }),
    cache: new InMemoryCache({
      resultCaching: false,
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'ignore',
      },
      query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      },
    },
  });
}

export async function getUsersByRefCode(id: string): Promise<UserEntity[]> {
  const client = createClient(getSubgraphUrl() ?? 'no_url');

  let skip = 0;
  let allUsers: UserEntity[] = [];
  let fetchMore = true;

  while (fetchMore) {
    const { data } = await client.query({
      query: getUserByRefCodeQuery(),
      variables: { id, skip },
    });

    if (data.userEntities && data.userEntities.length > 0) {
      allUsers = allUsers.concat(data.userEntities);
      skip += data.userEntities.length;
    } else {
      fetchMore = false;
    }
  }

  return allUsers;
}

export async function getUsers(): Promise<UserEntity[]> {
  const client = createClient(getSubgraphUrl() ?? 'no_url');

  let skip = 0;
  let allUsers: UserEntity[] = [];
  let fetchMore = true;

  while (fetchMore) {
    const { data } = await client.query({
      query: getUsersQuery(),
      variables: { skip },
    });

    if (data.userEntities && data.userEntities.length > 0) {
      allUsers = allUsers.concat(data.userEntities);
      skip += data.userEntities.length;
    } else {
      fetchMore = false;
    }
  }

  return allUsers;
}