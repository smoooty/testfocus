import { screen, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

const isHTMLElement = (el) => el instanceof HTMLElement;

const getChildNodes = (container) => {
  if (!isHTMLElement(container)) {
    Logger(`Cannot get child nodes, ${container} is not an HTMLElment`);
    return [];
  }

  const focusableTags =
    '[href], button, textarea, input, select, details, [tabindex]:not([tabindex="-1"]';
  // get a list of child nodes in the trap container's content
  const childNodes = Array.from(container.querySelectorAll(focusableTags)).filter(
    node => !node.getAttribute('aria-hidden') && !node.hasAttribute('disabled')
  );

  return childNodes;
};

const useFocusTrap = ({ container, onExit, onEnter, shouldTrap }) => {
  const previouslyFocusedElement = useRef(null);

  const handleExit = () => {
    onExit?.();
  };

  // `useLayoutEffect` runs before browser paint; at this point `document.activeElement`
  // has not yet been updated to the focus trap container so we can grab that HTMLElement and
  // store it in a ref to use later.
  useLayoutEffect(() => {
    if (shouldTrap && isHTMLElement(document.activeElement)) {
      previouslyFocusedElement.current = document.activeElement;
    }
  }, [shouldTrap]);

  useEffect(() => {
    /**  prevents tabbing outside of the trap */
    const handleTab = (event) => {
      if (!shouldTrap || !isHTMLElement(container)) {
        return;
      }

      const childNodes = getChildNodes(container);

      const isChildNode = container?.contains(document.activeElement);
      const lastNode = childNodes[childNodes.length - 1];
      const firstNode = childNodes[0];
      const isFirstNode = document.activeElement === firstNode;
      const isLastNode = document.activeElement === lastNode;
      const isContainer = document.activeElement === container;

      /** tab, moves focus forward */
      const handleForward = () => {
        if (isLastNode) {
          event.preventDefault();
          isHTMLElement(firstNode) && firstNode.focus();
        }
      };

      /** shift + tab, moves focus backward */
      const handleBackward = () => {
        if (isFirstNode || isContainer) {
          event.preventDefault();
          isHTMLElement(lastNode) && lastNode.focus();
        }
      };

      if (isChildNode) {
        event.shiftKey ? handleBackward() : handleForward();
      } else {
        // The document.activeElement is not a childNode, e.g. user is focused on url bar
        // when they tab onto the page we need to send focus to the first element
        event.preventDefault();
        firstNode.focus();
      }
    };

    const handleKeydown = (event) => {
      switch (event.key) {
        case 'Tab':
          return handleTab(event);
        case 'Escape':
          return handleExit();
        default:
          return event;
      }
    };

    if (shouldTrap) {
      if (onEnter) {
        onEnter(getChildNodes(container));
      }

      document.addEventListener('keydown', handleKeydown);
    }

    return () => {
      previouslyFocusedElement.current?.focus();

      document.removeEventListener('keydown', handleKeydown);
    };
  }, [shouldTrap]);
};

const FocusTrap = ({ container, onEnter, onExit, shouldTrap, ...props }) => {
  const [isReady, setIsReady] = useState(false);
  const shouldTrapAndIsReady = shouldTrap && isReady;
  useFocusTrap({ shouldTrap: shouldTrapAndIsReady, container: container.current, onEnter, onExit });

  return (
    <div
      ref={element => {
        container.current = element;
        setIsReady(true);
      }}
      {...props}
    />
  );
};
const TestComponent = () => {
  const panel = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  useFocusTrap({
    shouldTrap: isOpen,
    container: panel.current,
    onEnter: () => panel.current?.focus(),
    onExit: () => setIsOpen(false),
  });

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>toggle</button>
      <div ref={panel} role="dialog" tabIndex={-1}>
        {isOpen && (
          <>
            <button>button</button>
            <input type="text" name="input" id="input" placeholder="input" />
            <label htmlFor="input">input</label>
            <a href="/home">link</a>
          </>
        )}
      </div>
    </div>
  );
};

describe('useFocusTrap', () => {
  it('traps the focus within the container when pressing tab', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    // open dialog
    const trigger = screen.getByRole('button', { name: /toggle/i });
    trigger.focus();
    expect(trigger).toHaveFocus();
    await user.click(trigger);

    // dialog displays and has focus
    const dialogContent = screen.queryByText(/link/i);
    const dialog = screen.getByRole('dialog');
    expect(dialogContent).toBeInTheDocument();
    expect(dialog).toHaveFocus();

    // tab moves focus to next element
    const button = screen.getByRole('button', { name: /button/i });
    await user.tab();
    expect(button).toHaveFocus();

    // tab moves focus to next element
    await user.tab();
    const textbox = screen.getByRole('textbox', { name: /input/i });
    expect(textbox).toHaveFocus();

    // tab moves focus to next element
    await user.tab();
    const link = screen.getByRole('link', { name: /link/i });
    expect(link).toHaveFocus();

    // we have tabbed through all elements, so now focus should cycle back to the first element
    await user.tab();
    expect(button).toHaveFocus();

    // it closes and returns focus to originally focused element
    await user.keyboard('{Escape}');
    expect(dialogContent).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('traps the focus within the container when pressing shift+tab', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    // open dialog
    const trigger = screen.getByRole('button', { name: /toggle/i });
    trigger.focus();
    expect(trigger).toHaveFocus();
    await user.click(trigger);

    // dialog displays and has focus
    const dialogContent = screen.queryByText(/link/i);
    const dialog = screen.getByRole('dialog');
    expect(dialogContent).toBeInTheDocument();
    expect(dialog).toHaveFocus();

    // moves backwards
    const link = screen.getByRole('link', { name: /link/i });
    await user.tab({ shift: true });
    expect(link).toHaveFocus();

    // moves back again
    await user.tab({ shift: true });
    const textbox = screen.getByRole('textbox', { name: /input/i });
    expect(textbox).toHaveFocus();
  });
});

export const FocusTrapTest = () => {
  const [isThere, setIsThere] = useState(false);
  const container = useRef(null);

  return (
    <div>
      <button onClick={() => setIsThere(v => !v)}>toggle</button>
      {/**
       * The main functionality of the FocusTrap component is to wrap over the useFocusTrap hook
       * and handle situations like this where the focus trap container ref is attached to a conditionally rendered element.
       * We need to ensure that the element exists and the ref is attached before we focus it.
       */}
      {isThere && (
        <FocusTrap
          shouldTrap={isThere}
          container={container}
          onEnter={([first]) => first?.focus()}
          onExit={() => setIsThere(false)}
        >
          <button>1</button>
          <button>2</button>
        </FocusTrap>
      )}
    </div>
  );
};

describe('FocusTrap', () => {
  it('focuses AFTER the ref has been successfully attached', async () => {
    render(<FocusTrapTest />);

    const trigger = screen.getByRole('button', { name: /toggle/i });

    trigger.focus();
    expect(trigger).toHaveFocus();
    // open trap
    await userEvent.click(trigger);
    // first item has focus
    expect(await screen.findByRole('button', { name: /1/i })).toHaveFocus();
    // close trap
    await userEvent.keyboard('{Escape}');
    // focus is returned to trigger
    expect(trigger).toHaveFocus();
  });
});
