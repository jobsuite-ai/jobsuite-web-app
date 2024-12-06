import { Image } from '@mantine/core';

export function RLPPLogo() {
  return (
    <Image
      radius="md"
      h={80}
      src="/RLPP_logo.png"
      w="auto"
      fit="contain"
      left='30px'
      top={0}
      style={{ position: 'fixed' }}
    />
  )
}