import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const PageLinkComponent = ({ attributes, children, element }: any) => {
    const navigate = useNavigate();

    const handleClickLinkText = useCallback(
        (event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            event.stopPropagation();

            const { url } = element;
            navigate(url);
        },
        [element, navigate]
    );

    return (
        <a {...attributes} href={element.url}>
            <span onClick={handleClickLinkText}>{children}</span>
        </a>
    );
};
