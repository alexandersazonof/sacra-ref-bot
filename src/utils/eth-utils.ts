import { isValidAddress } from 'ethereumjs-util';

export function isEthereumAddress(address: string): boolean {
  return isValidAddress(address);
}