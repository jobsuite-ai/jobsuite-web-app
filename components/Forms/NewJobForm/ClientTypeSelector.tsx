import { Center, Flex, SegmentedControl, rem } from '@mantine/core';
import { IconUser, IconUserPlus } from '@tabler/icons-react';

export default function ClientTypeSelector({ setClientType }: { setClientType: Function }) {
    return (
        <Flex justify="center" mb="lg">
            <SegmentedControl
              onChange={(val) => setClientType(val)}
              transitionDuration={250}
              data={[
                    {
                        value: 'new',
                        label: (
                            <Center style={{ gap: 10 }}>
                                <IconUserPlus style={{ width: rem(16), height: rem(16) }} />
                                <span>New Client</span>
                            </Center>
                        ),
                    },
                    {
                        value: 'existing',
                        label: (
                            <Center style={{ gap: 10 }}>
                                <IconUser style={{ width: rem(16), height: rem(16) }} />
                                <span>Existing Client</span>
                            </Center>
                        ),
                    },
                ]}
            />
        </Flex>
    );
}
