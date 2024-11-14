"use client";

import { Header } from './Header/Header';
import styled from 'styled-components';

export function Shell({ children }: { children: any }) {
  const Wrapper = styled.div`
    display: flex;
    flex-direction: row;
    justify-context: center;
    gap: 10px;
  `;

  const VerticalWrapper = styled.div`
    display: flex;
    flex-direction: column;
    justify-context: center;
    align-items: stretch;
  `;

  const Spacer = styled.div`
    flex-grow: 1;
  `;

  const Main = styled.div`
    flex-grow: 2;
  `;

  return (
    <VerticalWrapper>
      <Header />
      <Wrapper>
        <Spacer />
        <Main>{children}</Main>
        <Spacer />
      </Wrapper>
    </VerticalWrapper>
  );
}