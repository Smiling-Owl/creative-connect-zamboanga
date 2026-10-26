import { useCallback, useState } from 'react';
import { PERSONAS } from '../fixtures/personas';
import { useDemo } from '../state/store';
import { Button, ConfirmDialog } from '../components/ui';

// Demo controls sit outside the product. They change the demo session and simulate conditions.
// They are not authentication and do not represent real security.

export function DemoControls() {
  const { state, persona, setPersona, setOnline, setFailNextSend, reset } = useDemo();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const cancelReset = useCallback(() => setConfirmingReset(false), []);
  const confirmReset = useCallback(() => {
    setConfirmingReset(false);
    reset();
  }, [reset]);

  return (
    <aside className="demo-bar" aria-label="Demo controls">
      <details>
        <summary>Demo controls — not part of the service</summary>
        <div className="demo-grid">
          <label className="field-inline">
            <span>Persona</span>
            <select value={persona.id} onChange={(event) => setPersona(event.target.value)}>
              {PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" onClick={() => setOnline(!state.settings.online)}>
            {state.settings.online ? 'Connection: online (simulated)' : 'Connection: offline (simulated)'}
          </Button>
          <Button variant="secondary" onClick={() => setFailNextSend(!state.settings.failNextSend)}>
            {state.settings.failNextSend ? 'Next send: will fail (simulated)' : 'Next send: normal (simulated)'}
          </Button>
          <Button variant="danger" onClick={() => setConfirmingReset(true)}>
            Reset demo data
          </Button>
        </div>
        <p className="demo-note">{persona.description} Demo data stays in this browser and is fictional.</p>
      </details>
      <ConfirmDialog
        open={confirmingReset}
        title="Reset demo data?"
        message="This restores the starting fictional data and clears every change you made in this browser."
        confirmLabel="Reset demo data"
        onConfirm={confirmReset}
        onCancel={cancelReset}
      />
    </aside>
  );
}
