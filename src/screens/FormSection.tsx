import FormStep from '../components/FormStep'
import { flow } from '../content'
import { useSession } from '../hooks/useSession'
import { prevStep, nextStep } from '../app/steps'

type FormSectionStep = 'intake' | 'digital' | 'ai'

// Drives every JSON form step (intake, digital, ai). Answers live in the local
// draft and are saved in one batch at the end.
export default function FormSection({ step }: { step: FormSectionStep }) {
  const { goTo } = useSession()
  const back = prevStep(step)
  const next = nextStep(step)
  return (
    <FormStep
      content={flow.questionnaires[step]}
      step={step}
      onBack={back ? () => goTo(back) : undefined}
      onSubmit={async () => next && goTo(next)}
    />
  )
}
