import FormStep from '../components/FormStep'
import { flow } from '../content'
import { useSession } from '../hooks/useSession'
import { prevStep, nextStep } from '../app/steps'

type FormSectionStep = 'intake' | 'digital' | 'ai'

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
