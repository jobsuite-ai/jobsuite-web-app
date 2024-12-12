import { Image } from '@mantine/core';

export function RLPPLogo() {
  return (
    <Image
      radius="md"
      h='60px'
      src="/RLPP_logo.png"
      w="auto"
      fit="contain"
      top='10px'
      style={{ position: 'fixed' }}
    />
  )
}